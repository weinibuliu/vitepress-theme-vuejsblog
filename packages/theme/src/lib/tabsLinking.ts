import { reactive } from 'vue'

/**
 * The choices linked Tab Groups share, and how long a page keeps them.
 *
 * Tab Groups are siblings: two `::: tabs#shell` blocks on one page have no parent and child
 * between them, so what they share has to live outside the component tree. It is shared by page
 * because a Tab Id names a choice *on the page being read*: a reader who moves to another page
 * meets that page's groups fresh, and a reader who comes back to this one — or reloads it —
 * starts from the default again. Nothing is written to the reader's browser.
 *
 * The count is what makes the lifetime exact. Dropping a page's entry when *a* group leaves would
 * strand the groups still on the page with a store no later group could join; dropping it when
 * the last one leaves is the moment the page itself is gone.
 */
export interface PageChoices {
  /** The value each Tab Id on the page holds. Reactive: a group follows another's choice. */
  choice: Record<string, string>

  /** How many Tab Groups on the page hold these choices. */
  groups: number
}

const pages = new Map<string, PageChoices>()

/**
 * The page's choices, creating them if this is its first group.
 *
 * Keyed by the page's path, as VitePress states it — the same string a group captured when it
 * was set up, so a group leaving during a navigation still releases the page it belonged to.
 */
export function joinPage(path: string): PageChoices {
  let entry = pages.get(path)
  if (entry === undefined) {
    entry = { choice: reactive<Record<string, string>>({}), groups: 0 }
    pages.set(path, entry)
  }
  entry.groups += 1
  return entry
}

/** Leave the page, forgetting it once its last group has gone. */
export function leavePage(path: string, entry: PageChoices): void {
  entry.groups -= 1
  if (entry.groups === 0) pages.delete(path)
}

/** The value a Tab Id on the page holds, or `undefined` when nothing has chosen yet. */
export function recall(entry: PageChoices, tabId: string): string | undefined {
  return entry.choice[tabId]
}

/** Record a choice for a Tab Id, which every other group holding it follows. */
export function remember(
  entry: PageChoices,
  tabId: string,
  value: string
): void {
  entry.choice[tabId] = value
}
