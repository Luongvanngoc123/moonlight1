<template>
  <q-dialog v-model="showDialogLogin" transition-show="scale" transition-hide="scale">
    <q-card class="bg-dark-900 border border-white/10 shadow-2xl rounded-2xl overflow-hidden w-full max-w-md">
      <!-- Header with Gradient -->
      <q-btn dense round flat icon="close" v-close-popup class="absolute top-2 right-2 z-50 text-gray-400 hover:text-white" />

      <div class="p-6">
        <div class="text-center mb-6">
            <div class="text-2xl font-bold text-white mb-1">{{ isRegister ? "Tạo tài khoản" : "Chào mừng trở lại!" }}</div>
            <div class="text-gray-400 text-sm">{{ isRegister ? "Tham gia cộng đồng Moonlight ngay thôi" : "Đăng nhập để đồng bộ lịch sử xem" }}</div>
        </div>

        <form @submit.prevent="authLocal" class="flex flex-col gap-4">
        <transition-group appear enter-active-class="animated fadeIn" leave-active-class="animated fadeOut">
            <q-input
                v-if="isRegister"
                key="name"
                v-model="name"
                outlined
                dense
                bg-color="transparent"
                class="premium-input"
                placeholder="Tên hiển thị"
                color="primary"
            >
                <template v-slot:prepend>
                    <q-icon name="badge" class="text-gray-400" />
                </template>
            </q-input>

            <q-input
                key="email"
                v-model="email"
                outlined
                dense
                bg-color="transparent"
                class="premium-input"
                type="email"
                placeholder="Email"
                color="primary"
            >
                <template v-slot:prepend>
                    <q-icon name="mail" class="text-gray-400" />
                </template>
            </q-input>

            <q-input
                key="pass"
                v-model="password"
                outlined
                dense
                bg-color="transparent"
                class="premium-input"
                :type="showPassword ? 'text' : 'password'"
                placeholder="Mật khẩu"
                color="primary"
            >
                <template v-slot:prepend>
                    <q-icon name="key" class="text-gray-400" />
                </template>
                <template v-slot:append>
                    <q-btn round flat dense :icon="showPassword ? 'visibility' : 'visibility_off'" @click="showPassword = !showPassword" class="text-gray-400 text-xs" size="sm" />
                </template>
            </q-input>
        </transition-group>

        <q-btn
            type="submit"
            class="bg-gradient-to-r from-purple-600 to-blue-600 text-white w-full py-3 rounded-lg font-bold shadow-lg shadow-purple-500/30 hover:scale-[1.02] transition-transform mt-2"
            unelevated
            :loading="loading"
        >
            {{ isRegister ? "Đăng ký ngay" : "Đăng nhập" }}
        </q-btn>

        <div class="text-center mt-4">
            <span class="text-gray-400 text-sm">{{ isRegister ? "Đã có tài khoản?" : "Chưa có tài khoản?" }}</span>
            <span class="text-primary font-bold cursor-pointer ml-1 hover:underline" @click="isRegister = !isRegister">
                {{ isRegister ? "Đăng nhập" : "Đăng ký ngay" }}
            </span>
        </div>
        </form>
      </div>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { Icon } from "@iconify/vue"
import { useAuthStore } from "stores/auth"
import { useQuasar } from "quasar"
import { useI18n } from "vue-i18n"
import { ref } from "vue"

const showDialogLogin = defineModel<boolean>("modelValue", { required: true })
const { t } = useI18n()
const authStore = useAuthStore()

const isRegister = ref(false)
const showPassword = ref(false)
const loading = ref(false)

// Local
const email = ref("")
const password = ref("")
const name = ref("")

const $q = useQuasar()

async function authLocal() {
    loading.value = true
    try {
        if (isRegister.value) {
            await authStore.registerLocal(email.value, password.value, name.value)
            $q.notify({ type: "positive", message: "Đăng ký thành công! Đã tự động đăng nhập.\nChào mừng " + name.value + "!" })
        } else {
            await authStore.loginLocal(email.value, password.value)
            $q.notify({ type: "positive", message: "Đăng nhập thành công!" })
        }
        showDialogLogin.value = false
    } catch (e: any) {
        $q.notify({ type: "negative", message: "Thất bại: " + (e.message || "Lỗi không xác định") })
    } finally {
        loading.value = false
    }
}
</script>

<style lang="scss" scoped>
.premium-input :deep(.q-field__control) {
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(0, 0, 0, 0.2) !important;
    transition: all 0.3s;

    &:hover {
        border-color: rgba(255, 255, 255, 0.3);
        background: rgba(0, 0, 0, 0.3) !important;
    }
    &.q-field--highlighted {
        border-color: var(--q-primary);
        background: rgba(var(--q-primary), 0.1) !important;
    }
}

.premium-input :deep(.q-field__native),
.premium-input :deep(.q-field__input) {
    color: white !important;
    background-color: transparent !important;
}

.premium-input :deep(.q-field__label) {
    color: rgba(255, 255, 255, 0.7);
}

/* Fix Autofill White Background */
.premium-input :deep(input:-webkit-autofill),
.premium-input :deep(input:-webkit-autofill:hover),
.premium-input :deep(input:-webkit-autofill:focus),
.premium-input :deep(input:-webkit-autofill:active) {
    -webkit-box-shadow: 0 0 0 30px #1e1e1e inset !important;
    -webkit-text-fill-color: white !important;
    transition: background-color 5000s ease-in-out 0s;
}

</style>
