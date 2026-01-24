<template>
  <SkeletonCardVertical v-if="loading" v-for="i in 12" :key="i" class="mb-4" />
  <q-infinite-scroll
    v-else-if="data"
    ref="infiniteScrollRef"
    @load="onLoad"
    :offset="250"
    :scrollTarget
  >
    <CardVertical
      v-for="item in data?.items"
      :key="item.path"
      :data="item"
      class="mb-4"
    />
    <template v-slot:loading>
      <div class="row justify-center q-my-md">
        <q-spinner class="c--main" size="40px" />
      </div>
    </template>
  </q-infinite-scroll>
  <div v-else class="text-center">
    <div class="text-subtitle1 font-weight-medium">
      {{ t("loi-khong-xac-dinh") }}
    </div>
    <q-btn outline rounded color="main" @click="refreshAsync">{{
      t("thu-lai")
    }}</q-btn>
  </div>
</template>

<script setup lang="ts">
import { QInfiniteScroll } from "quasar"
import { TuPhim } from "src/apis/runs/tu-phim"
import { useRequest } from "vue-request"
import { useAuthStore } from "stores/auth"
import { useFollowsStore } from "stores/follows"

const { t } = useI18n()
defineProps<{
  scrollTarget?: Element
}>()

const authStore = useAuthStore()
const followsStore = useFollowsStore()

let page = 1
const { data, loading, refreshAsync } = useRequest(async () => {
    if (authStore.supabaseUser) {
        await followsStore.sync()
        // Simulate pagination logic or return all
        // For simplicity, returning all on first page, empty on others
        if (page > 1) return { items: [] }
        return {
            items: followsStore.followsData.map(meta => ({
                path: `/phim/${meta.slug}`,
                name: meta.name,
                poster: meta.poster,
                // Add default fields to match TuPhim response interface
                image: meta.poster,
                domain: "",
                status: "",
                views: 0
            }))
        }
    }
    return TuPhim(page++)
}, {
  cacheKey: "favorites",
  cacheTime: 5 * 60 * 1000
})

const infiniteScrollRef = ref<QInfiniteScroll>()

async function onLoad(index: number, done: (end: boolean) => void) {
  if (!data.value) return

  let items: any[] = []

  if (authStore.supabaseUser) {
      // Local Auth: Client-side pagination mock
      // Since we loaded all in first page, subsequent loads are empty
      items = []
  } else {
      const res = await TuPhim(page++)
      items = res.items
  }

  if (items.length === 0) return done(true)

  data.value.items.push(...items)
  done(false)
}
</script>
