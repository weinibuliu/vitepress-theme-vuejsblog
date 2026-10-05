// const EXTERNAL_CLASS = 'vp-blog-external-link'

export function isExternal(href: string): boolean {
  if (!href) return false
  if (/^(#|mailto:|tel:|javascript:)/i.test(href)) return false
  try {
    return new URL(href, location.href).origin !== location.origin
  } catch {
    return false
  }
}
