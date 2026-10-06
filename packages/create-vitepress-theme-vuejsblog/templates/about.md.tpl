---
layout: page
title: About
---

# About

This is a Page, not a Post. It lives outside `posts/`, so the Theme leaves it alone and
VitePress renders it as an ordinary document. `layout: page` says the same thing for a
file that is inside the Blog's directory but should not be listed in it.<% if (author) { %>

Written by <%= author %>.<% } %>
