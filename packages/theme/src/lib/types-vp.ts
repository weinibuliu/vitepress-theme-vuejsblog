/**
 * 对 Vitepress 的类型注解拓展
 */

import 'vitepress'

declare module 'vitepress' {
  interface MarkdownOptions {
    /**
     * Enable tabs
     */
    tabs?: boolean
  }
}
