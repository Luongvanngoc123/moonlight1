import { defineStore } from "pinia"
import { supabase } from "src/boot/supabase"
import { useAuthStore } from "./auth"
import { ref } from "vue"

export const useFollowsStore = defineStore("follows", () => {
  const authStore = useAuthStore()
  const follows = ref<string[]>([])
  const followsData = ref<any[]>([])

  async function sync() {
    if (!authStore.isLogged) return
    // If using Local Auth (Supabase)
    if (authStore.supabaseUser) {
        const { data, error } = await supabase
            .from("follows")
            .select("*")

        if (error) {
            console.error("Error fetching follows:", error)
            return
        }

        follows.value = data.map((item: any) => item.movie_slug)
        followsData.value = data.map((item: any) => item.meta)
    }
  }

  async function toggle(slug: string, meta: any) {
    if (!authStore.isLogged) return

    if (follows.value.includes(slug)) {
        // Unfollow
        const { error } = await supabase
            .from("follows")
            .delete()
            .eq("movie_slug", slug)
            .eq("user_id", authStore.supabaseUser.id)

        if (error) throw error
        follows.value = follows.value.filter(id => id !== slug)
    } else {
        // Follow
        const { error } = await supabase
            .from("follows")
            .insert({
                user_id: authStore.supabaseUser.id,
                movie_slug: slug,
                meta
            })

        if (error) throw error
        follows.value.push(slug)
    }
  }

  function isFollowed(slug: string) {
    return follows.value.includes(slug)
  }

  return { follows, followsData, sync, toggle, isFollowed }
})
