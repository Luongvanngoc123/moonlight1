<template>
  <div
    @click.stop="onBarClick"
    class="relative flex-1 mx-2 md:min-w-[164px] md:w-full max-w-[598px] z-50"
  >
    <q-input
      v-model="query"
      dense
      rounded
      outlined
      clearable
      class="font-weight-normal input-search bg-[rgba(255,255,255,0.1)] w-full"
      input-style="background-color: transparent"
      :placeholder="t('tim-kiem')"
      @focus="focusing = true"
      @blur="focusing = false"
      @keydown.stop
      @keyup.enter="search"
      :readonly="$q.screen.lt.sm"
      ref="inputSearchRef"
    >
      <template v-slot:append>
        <q-separator vertical inset class="bg-[rgba(153,153,153,0.3)]" />
        <button
          class="flex items-center"
          @click.stop.prevent="search"
          @mousedown.stop.prevent
        >
          <q-icon name="search" class="pl-6 pr-4 cursor-pointer" />
        </button>
      </template>
    </q-input>

    <!-- Desktop Dropdown -->
    <transition name="q-transition--fade">
      <ul
        v-if="!$q.screen.lt.sm"
        class="absolute w-full bg-dark-page left-0 max-h-[80vh] overflow-y-auto scrollbar-custom pb-4 top-[calc(100%+8px)] !shadow-8"
        v-show="focusing"
        @click.stop.prevent
        @mousedown="
          (event) => {
            if (event.button === 2) event.preventDefault()
          }
        "
      >
        <li
          v-if="query"
          class="px-4 mt-1 py-[0.5rem] flex items-center w-full justify-between"
        >
          <div>
            <span class="text-gray-400 mr-1"
              >{{ t("tim-kiem-_keyword") }}
            </span>
            <span class="font-bold truncate">{{ query }}</span>
          </div>

          <button class="key-enter" @click="search">
            <span>{{ t("enter") }}</span>
          </button>
        </li>
        <li v-if="loading" v-for="i in 12" :key="i" class="flex mt-5 mx-4">
          <q-responsive :ratio="267 / 400" class="w-[90px] rounded">
            <q-skeleton type="rect" class="absolute w-full h-full" />
          </q-responsive>

          <div class="ml-2 flex-1">
            <q-skeleton type="text" width="60%" />
            <q-skeleton type="text" width="100px" height="15px" />
          </div>
        </li>
        <li
          v-else-if="data?.length"
          v-for="item in data"
          :key="item.path"
          class="relative"
          v-ripple
        >
          <router-link
            :to="item.path"
            class="flex flex-nowrap mt-5 mx-4"
            @click="saveAnalytics"
          >
            <div>
              <q-img-custom
                :ratio="267 / 400"
                :src="forceHttp2(item.image)"
                referrerpolicy="no-referrer"
                width="90px"
                class="rounded"
              />
            </div>

            <div class="ml-2">
              <div class="text-subtitle1 text-weight-medium">
                {{ item.name }}
              </div>
              <div class="text-gray-500">{{ item.status }}</div>
            </div>
          </router-link>
        </li>
        <li v-else class="px-4 py-5 text-center text-gray-400 w-full">
          {{ query ? "Không tìm thấy" : "Nhập để tìm kiếm" }}
        </li>
      </ul>
    </transition>

    <!-- Mobile Dialog -->
    <q-dialog
      v-model="showMobileSearch"
      maximized
      transition-show="slide-up"
      transition-hide="slide-down"
    >
      <q-card class="bg-dark-page text-white">
        <q-toolbar class="py-2">
          <q-btn flat round icon="arrow_back" v-close-popup />
          <q-input
            v-model="query"
            dense
            rounded
            outlined
            clearable
            autofocus
            class="font-weight-normal input-search bg-[rgba(255,255,255,0.1)] w-full ml-2"
            input-style="background-color: transparent"
            :placeholder="t('tim-kiem')"
            @keydown.enter="search(); showMobileSearch = false"
          >
             <template v-slot:append>
                <q-icon name="search" class="cursor-pointer" @click="search(); showMobileSearch = false" />
             </template>
          </q-input>
        </q-toolbar>

        <q-separator class="bg-gray-800" />

        <div class="p-2 h-full overflow-y-auto">
           <!-- Reuse list logic for mobile -->
           <div v-if="loading" v-for="i in 12" :key="i" class="flex mt-5 mx-4">
              <q-responsive :ratio="267 / 400" class="w-[90px] rounded">
                <q-skeleton type="rect" class="absolute w-full h-full" />
              </q-responsive>
              <div class="ml-2 flex-1">
                <q-skeleton type="text" width="60%" />
                <q-skeleton type="text" width="100px" height="15px" />
              </div>
           </div>
           <div v-else-if="data?.length">
              <div v-for="item in data" :key="item.path" class="relative" v-ripple>
                <router-link
                  :to="item.path"
                  class="flex flex-nowrap mt-5 mx-4"
                  @click="saveAnalytics(); showMobileSearch = false"
                >
                  <div>
                    <q-img-custom
                      :ratio="267 / 400"
                      :src="forceHttp2(item.image)"
                      referrerpolicy="no-referrer"
                      width="90px"
                      class="rounded"
                    />
                  </div>
                  <div class="ml-2">
                    <div class="text-subtitle1 text-weight-medium">
                      {{ item.name }}
                    </div>
                    <div class="text-gray-500">{{ item.status }}</div>
                  </div>
                </router-link>
              </div>
           </div>
           <div v-else class="px-4 py-5 text-center text-gray-400 w-full">
              {{ query ? "Không tìm thấy" : "Nhập để tìm kiếm" }}
           </div>
        </div>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { getAnalytics, logEvent } from "@firebase/analytics"
import { useEventListener } from "@vueuse/core"
import QImgCustom from "components/QImgCustom"
import { debounce, QInput, useQuasar } from "quasar"
import { PreSearch } from "src/apis/runs/pre-search"
import { checkContentEditable } from "src/helpers/checkContentEditable"
import { forceHttp2 } from "src/logic/forceHttp2"
import { ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { useRequest } from "vue-request"
import { useRouter } from "vue-router"

// key bind
const { t } = useI18n()
const $q = useQuasar()

const router = useRouter()
const analytics = getAnalytics()

const query = ref("")
const { data, loading, run } = useRequest(() => PreSearch(query.value), {
  manual: true
})
watch(query, debounce(run, 300))
function saveAnalytics() {
  logEvent(analytics, "search", {
    search_terms: query.value
  })
}

function search() {
  if (query.value.trim()) {
    router.push(`/tim-kiem/${query.value}`)
  }
}

const focusing = ref(false)
const showMobileSearch = ref(false)

function onBarClick() {
  if ($q.screen.lt.sm) {
    showMobileSearch.value = true
  }
}

const inputSearchRef = ref<QInput>()
useEventListener(window, "keypress", (event) => {
  if (checkContentEditable(document.activeElement)) return

  if (event.code === "Slash") {
    event.preventDefault()
    inputSearchRef.value?.focus()
  }
})
</script>

<style lang="scss" scoped>
.input-search :deep(.q-field__control) {
  height: 40px !important;
  input,
  input:focus {
    border: none;
    outline: none;
    box-shadow: none;
  }

  &:before {
    border-color: rgba(153, 153, 153, 0.3) !important;
  }
  &:after {
    border-width: 1px !important;
  }
}
</style>

<style lang="scss" scoped>
.key-enter {
  color: #f6f6f7;
  forced-color-adjust: none;
  height: 23px;
  width: auto;
  overflow: hidden;
  font-size: 12px;
  line-height: 1;
  text-transform: uppercase;

  &:hover {
    @apply pt-1;
  }

  span {
    background-color: #727d74;
    box-shadow: inset 0 -4px #202225;
    border: 1px solid hsl(220deg, 7.7%, 22.9%);
    padding: 3px 6px 4px;
    border-radius: 4px;
    min-width: 14px;
    min-height: 14px;
    height: 23px;
    color: #b9bbbe;
  }
}
</style>
