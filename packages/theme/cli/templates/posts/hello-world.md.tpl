---
title: Hello, world
date: <%= date %>
description: The first post on this blog, and a note on how to write the next one.
---

Welcome. This is a Post: a Markdown file under `posts/` with a `title` and a `date` in its
frontmatter. So it will be treated as post.

## Writing the next one

Add a file to `posts/`:

```md
---
title: A second post
date: <%= date %>
description: Shown in the list on the index, and used as the Feed summary.
---

Your writing starts here.

## If you want a title, please starts with `##`
```
