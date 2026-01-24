import type { Database } from "app/database.d.ts"
import { i18n } from "boot/i18n"
import { defineStore } from "pinia"
import { DaXem } from "src/apis/runs/da-xem"
import { supabase } from "src/boot/supabase"
import dayjs from "src/logic/dayjs"
import { getRealSeasonId } from "src/logic/getRealSeasonId"
import { addHostUrlImage, removeHostUrlImage } from "src/logic/urlImage"
import { ref } from "vue"

import { useAuthStore } from "./auth"

const GMT =
  self.Intl?.DateTimeFormat()?.resolvedOptions()?.timeZone ??
  Math.round(new Date().getTimezoneOffset() / 60)

export const useHistoryStore = defineStore("history", () => {
  const authStore = useAuthStore()

  const last30ItemError = ref<unknown | null>(null)
  const retryLoadLast30Item = ref(0)
  const last30Item = computedAsync(
    async () => {
      // eslint-disable-next-line no-unused-expressions
      retryLoadLast30Item.value
      if (!authStore.uid) return null

      const { data } = await supabase
        .rpc("get_watch_history_list", {
          user_uid: authStore.uid,
          page: 1,
          size: 30
        })
        .throwOnError()

      return (
        data?.map((item) => {
          item.poster = addHostUrlImage(item.poster)
          return item
        }) ?? EMPTY_ARRAY
      )
    },
    undefined,
    {
      lazy: true,
      shallow: true,
      onError(err) {
        last30ItemError.value = err
      }
    }
  )

  const refreshLast30Item = () => retryLoadLast30Item.value++

  async function loadMoreAfter(page: number) {
    if (!authStore.uid)
      throw new Error(
        i18n.global.t("errors.require_login_to", [
          i18n.global.t("xem-lich-su-gan-day")
        ])
      )

    const { data } = await supabase
      .rpc("get_watch_history_list", {
        user_uid: authStore.uid,
        page,
        size: 30
      })
      .throwOnError()

    return (
      data?.map((item) => {
        item.poster = addHostUrlImage(item.poster)
        return {
          ...item,
          timestamp: dayjs(item.created_at)
        }
      }) ?? []
    )
  }

  async function syncHistory() {
      // Disabled for Local Auth for now as it requires Proxy Token
      if (authStore.supabaseUser) {
          console.log("Sync History skipped for Local Auth")
          refreshLast30Item()
          return
      }

      if (!authStore.uid) throw new Error("Require login")

      const { items } = await DaXem(1) // Sync page 1 for now

      for (const item of items) {
          // item.path = /phim/slug-id
          // getRealSeasonId handles logic to extract ID if needed, or we use full path?
          // Existing code uses getRealSeasonId(season).

          await setProgressChap(
              item.path, // season
              item.chap || "Tap_?", // chap id??
              {
                  name: item.name,
                  poster: item.image,
                  season: item.path,
                  season_name: item.name
              },
              {
                  cur: 0,
                  dur: 0,
                  name: item.chap || "Tập ?"
              }
          ).catch((err) => console.warn("Sync fail for", item.name, err))
      }

      refreshLast30Item()
  }

  // async function createSeason(
  //   seasonId: string,
  //   info: Database["public"]["Tables"]["history"]["Insert"]
  // ): Promise<void> {
  //   if (!authStore.uid)
  //     throw new Error(
  //       i18n.global.t("errors.require_login_to", [
  //         i18n.global.t("luu-tien-trinh-xem-season-moi")
  //       ])
  //     )

  //   await supabase
  //     .rpc("add_history", {
  //       user_uid: authStore.uid,
  //       ...info,
  //       season: getRealSeasonId(seasonId),
  //       poster: removeHostUrlImage(info.poster)
  //     })
  //     .throwOnError()
  // }

  // children /chaps/:chap
  async function getProgressChaps(season: string) {
    if (!authStore.uid)
      throw new Error(
        i18n.global.t("errors.require_login_to", [
          i18n.global.t("xem-lich-su-gan-day")
        ])
      )

    const { data } = await supabase
      .rpc("get_watch_progress", {
        user_uid: authStore.uid,
        season_id: getRealSeasonId(season)
      })
      .throwOnError()

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return data!
  }
  async function getProgressChap(season: string, chap: string) {
    if (!authStore.uid)
      throw new Error(
        i18n.global.t("errors.require_login_to", [
          i18n.global.t("xem-lich-su-gan-day")
        ])
      )

    const { data } = await supabase
      .rpc("get_single_progress", {
        user_uid: authStore.uid,
        season_id: getRealSeasonId(season),
        p_chap_id: chap
      })
      .single()
      .throwOnError()

    return data
  }

  async function setProgressChap(
    season: string,
    chap: string,
    info: Omit<Database["public"]["Tables"]["history"]["Insert"], "user_id">,
    watchProgress: Pick<
      Database["public"]["Tables"]["chaps"]["Insert"],
      "cur" | "dur" | "name"
    >
  ) {
    if (!authStore.uid)
      throw new Error(
        i18n.global.t("errors.require_login_to", [
          i18n.global.t("luu-lich-su-xem")
        ])
      )

    await supabase
      .rpc("set_watch_history", {
        user_uid: authStore.uid,
        p_name: info.name,
        p_poster: removeHostUrlImage(info.poster),
        season_id: getRealSeasonId(info.season),
        p_season_name: info.season_name,

        e_cur: watchProgress.cur,
        e_dur: watchProgress.dur,
        e_name: watchProgress.name,
        e_chap: chap,
        gmt: GMT
      })
      .throwOnError()
  }

  async function getLastEpOfSeason(season: string): Promise<null | string> {
    if (!authStore.uid)
      throw new Error(
        i18n.global.t("errors.require_login_to", [
          i18n.global.t("xem-lich-su-gan-day")
        ])
      )

    const { data } = await supabase
      .rpc("get_last_chap", {
        user_uid: authStore.uid,
        season_id: getRealSeasonId(season)
      })
      .single()
      .throwOnError()

    return data?.chap_id ?? null
  }

  return {
    last30Item,
    last30ItemError,
    loadMoreAfter,

    refreshLast30Item,

    syncHistory,

    // createSeason,

    getProgressChaps,
    getProgressChap,
    setProgressChap,

    getLastEpOfSeason
  }
})
