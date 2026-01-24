/* eslint-disable camelcase */
import type TypeNormalValueParser from "src/apis/parser/[type_normal]/[value]"
import Worker from "src/apis/workers/[type_normal]/[value]?worker"
import { PostWorker } from "src/apis/wrap-worker"
import { i18n } from "src/boot/i18n"
import { get } from "src/logic/http"
import { useAuthStore } from "stores/auth"

export async function DaXem(page: number) {
  const { token_name, token_value } = useAuthStore()

  if (!token_name || !token_value)
    throw new Error(
      i18n.global.t("errors.require_login_to", [
        i18n.global.t("xem-lich-su-da-xem")
      ])
    )

  // Use the discovered endpoint
  // Pagination usually ?page=2 or /trang-2
  // We assume /tu-phim/da-xem/trang-X.html or query param?
  // TuPhim uses /tu-phim/trang-X.html
  // DaXem might be /tu-phim/da-xem/trang-X.html ?
  // Let's assume just /tu-phim/da-xem for page 1
  // and handle pagination if needed later.
  // For now, sync page 1.

  const url = page === 1 ? "/tu-phim/da-xem" : `/tu-phim/da-xem/trang-${page}.html` // Guessing pagination pattern

  const { data: html } = await get(url, {
    cookie: `${token_name}=${token_value}`
  })

  const now = Date.now()

  return PostWorker<typeof TypeNormalValueParser>(Worker, html, now, true)
}
