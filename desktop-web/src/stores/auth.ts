/* eslint-disable camelcase */

import {
  getAnalytics,
  logEvent,
  setUserId,
  setUserProperties
} from "@firebase/analytics"
import cookie from "js-cookie"
import { defineStore } from "pinia"
import { parse } from "set-cookie-parser"
import sha256 from "sha256"
import { DangNhap } from "src/apis/runs/dang-nhap"
import { GetUser } from "src/apis/runs/get-user"
import { i18n } from "src/boot/i18n"
import { supabase } from "src/boot/supabase"
import { post } from "src/logic/http"
import type { Ref } from "vue"
import { computed, nextTick, ref, toRaw, watch } from "vue"

interface User {
  avatar?: string
  email: string // const
  name: string // const
  sex: string
  username: string
}

let syncCookie: ((ref: Ref<unknown>, name: string) => void) | null = null
if (typeof BroadcastChannel !== "undefined") {
  const broad = new BroadcastChannel("sync_cookie")

  const cbs: Set<
    (event: MessageEvent<{ name: string; value: unknown }>) => void
  > = new Set()
  broad.onmessage = (event) => cbs.forEach((cb) => cb(event))

  syncCookie = function syncCookie(ref: Ref<unknown>, name: string) {
    let paused = false
    cbs.add(async (event) => {
      if (event.data.name === name) {
        paused = true
        ref.value = event.data.value
        await nextTick()
        paused = false
      }
    })

    watch(ref, (ref) => {
      if (!paused)
        broad.postMessage({
          name,
          value: toRaw(ref)
        })
      else console.info("[cookie sync]: bypass emit")
    })
  }
}

export const useAuthStore = defineStore("auth", () => {
  const analytics = getAnalytics()

  const user_data = ref(parseJSON(cookie.get("user_data")) as null | User)
  const token_name = ref((cookie.get("token_name") ?? null) as null | string)
  const token_value = ref((cookie.get("token_value") ?? null) as null | string)

  syncCookie?.(user_data, "user_data")
  syncCookie?.(token_name, "token_name")
  syncCookie?.(token_value, "token_value")

  const user = computed(() => {
    return user_data.value
  })
  // const uid = computed(() => {
  //   if (!user_data.value) return null
  //   return sha256(user_data.value.email + user_data.value.name)
  // })
  const isLogged = computed(() => {
    if (supabaseUser.value) return true
    return !!token_name.value && !!token_value.value && !!user_data.value
  })

  if (token_name.value && token_value.value)
    // eslint-disable-next-line promise/catch-or-return, promise/always-return
    GetUser(token_name.value, token_value.value).then((data) => {
      setUser({
        avatar: data.avatar,
        email: data.email,
        name: data.name,
        sex: data.sex,
        username: data.username
      })
      setTokenByCookie(data.cookie)
    })

  function setUser(value: User) {
    user_data.value = value
    cookie.set("user_data", JSON.stringify(value), {
      expires: 30,
      sameSite: "None",
      secure: true
    })
  }
  function setToken(name: string, value: string) {
    token_name.value = name
    token_value.value = value
    cookie.set("token_name", name, {
      expires: 30,
      sameSite: "None",
      secure: true
    })
    cookie.set("token_value", value, {
      expires: 30,
      sameSite: "None",
      secure: true
    })
  }
  function deleteUser() {
    user_data.value = null
    cookie.set("user_data", "", { expires: -1 })
  }
  function deleteToken() {
    token_name.value = null
    token_value.value = null
    cookie.set("token_name", "", { expires: -1 })
    cookie.set("token_value", "", { expires: -1 })
  }
  function setTokenByCookie(cookie: string) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const parsedCookies = parse(cookie);
    console.log("[Auth] Parsing cookies:", parsedCookies.length);

    const token = parsedCookies.find((item) => item && item.name && (item.name.startsWith("token") || item.name === "PHPSESSID"))

    // Fallback if HttpOnly or not found
    if (!token) {
        console.warn("[Auth] Token not found in cookies, using fallback");
        setToken("BROWSER_COOKIE", "TRUE")
        return { name: "BROWSER_COOKIE", value: "TRUE" }
    }

    // set token
    setToken(token.name, token.value)
    return token
  }
  // ** actions **
  async function login(email: string, password: string) {
    const data = await DangNhap(email, password)

    setUser({
      avatar: data.avatar,
      email: data.email,
      name: data.name,
      sex: data.sex,
      username: data.username
    })
    setTokenByCookie(data.cookie)

    logEvent(analytics, "login")

    return data
  }
  async function logout() {
    deleteToken()
    deleteUser()
    supabaseUser.value = null // Immediate UI update

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.auth as any).signOut().catch((err: any) => console.warn("SignOut error:", err))

    logEvent(analytics, "logout")
  }
  async function changePassword(newPassword: string) {
    if (!user_data.value)
      throw new Error(
        i18n.global.t("errors.require_login_to", [
          i18n.global.t("thay-doi-mat-khau")
        ])
      )

    const { headers } = await post(
      "/account/info/",
      {
        "User[hoten]": user_data.value.username,
        "User[gender]": user_data.value.sex,
        "User[password]": newPassword,
        submit: "Cập nhật"
      },
      {
        cookie: `${token_name.value}=${token_value.value}`
      }
    ).catch((res) => {
      // eslint-disable-next-line promise/no-return-wrap
      if (res.status === 302 && res.data) return Promise.resolve(res)

      // eslint-disable-next-line promise/no-return-wrap
      return Promise.reject(res)
    })

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const cookie = new Headers(headers).get("set-cookie")!
    setTokenByCookie(cookie)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabaseUser = ref<any>(null)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(supabase.auth as any).onAuthStateChange((event: any, session: any) => {
    console.log("[Auth] Auth State Change:", event, session?.user?.id)
    supabaseUser.value = session?.user ?? null
    if (session?.user) {
      // Sync to local user_data for compatibility
      const meta = session.user.user_metadata
      setUser({
        email: session.user.email ?? "",
        name: meta.name ?? session.user.email?.split("@")[0] ?? "User",
        avatar: meta.avatar,
        sex: "unknown",
        username: meta.name ?? "User"
      })
    }
  })

  // Init session
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(supabase.auth as any).getSession().then(({ data }: any) => {
    console.log("[Auth] GetSession:", data.session?.user?.id)
    supabaseUser.value = data.session?.user ?? null
  })

  async function registerLocal(email: string, password: string, name: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.auth as any).signUp({
      email,
      password,
      options: {
        data: { name }
      }
    })
    if (error) throw error
    return data.user
  }

  async function loginLocal(email: string, password: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.auth as any).signInWithPassword({
      email,
      password
    })
    if (error) throw error
    return data.user
  }

  // Analytics
  watch(
    user_data,
    (user_data) =>
      setUserProperties(analytics, {
        sex: user_data?.sex ?? "unknown"
      }),
    { immediate: true }
  )

  // Computed Overrides
  const _uid = computed(() => {
    if (supabaseUser.value) return supabaseUser.value.id
    if (!user_data.value) return null
    return sha256(user_data.value.email + user_data.value.name)
  })

  watch(_uid, (uid) => setUserId(analytics, uid ?? null), { immediate: true })

  watch(
    _uid,
    async (uid) => {
      if (!uid || !user_data.value) return

      await supabase
        .rpc("ensure_user", {
          p_uuid: uid,
          p_email: user_data.value?.email,
          p_name: user_data.value?.name
        })
        .throwOnError()
    },
    { immediate: true }
  )

  return {
    user_data,
    token_name,
    token_value,
    user,
    uid: _uid,
    isLogged,
    setUser,
    setToken,
    deleteUser,
    deleteToken,
    setTokenByCookie,
    login,
    logout,
    changePassword,
    // Native Auth
    registerLocal,
    loginLocal,
    supabaseUser
  }
})

function parseJSON(value?: string) {
  if (!value) return null

  try {
    return JSON.parse(value) ?? null
  } catch {
    return null
  }
}
