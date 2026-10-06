# Vuejsblog VitePress Theme

A distributable VitePress theme that reproduces the visual and structural style of
`blog.vuejs.org` for personal blogs, so that blog authors do not have to fork a site
to get that style.

## Language

### The theme

**Theme**:
A published npm package that provides a VitePress blog's layout, components, styles
and post-discovery behaviour. It contains no content.
_Avoid_: template, starter, boilerplate, scaffold

**Style Layer**:
The Theme's own hand-written CSS. It is self-contained and does not depend on the
Site running a CSS framework.
_Avoid_: tailwind, utilities, design tokens

**Site**:
A VitePress project that consumes the Theme and owns all of its content. The Site
owns the content; the Theme owns the presentation.
_Avoid_: blog, project, app

**Post**:
A single Markdown entry within Collection Scope that the Theme renders through its
Article layout. Whether it also belongs to the Blog is a separate question, decided
by its Draft and Undated state.
_Avoid_: article, entry, page

**Page**:
A Markdown file that is not a Post: either outside Collection Scope, or inside it and
stating `layout: page`, which VitePress renders as an ordinary document. The Theme leaves
it out of the Blog and the Feed.
_Avoid_: static page, doc, non-post

**Blog**:
The ordered collection of a Site's Posts, together with the Site-level metadata that
describes it.
_Avoid_: post list, archive, feed

**Collection Scope**:
The glob patterns in Theme Config that decide which Markdown files are Post
candidates. Scope is the Theme's only rule for what it looks at; a file in scope
declines to be a Post by stating a `layout` of its own.
_Avoid_: include, filter, posts dir

**Draft**:
A Post marked `draft: true`. The Blog lists it in dev and leaves it out of both the
Blog and the Feed in a production build.
_Avoid_: unpublished, hidden, WIP

**Undated**:
A Post candidate carrying no usable date. It renders, but it belongs to no Blog and
no Feed, because the Blog is ordered by date and there is nothing to order it by.
The Theme tells the author about it rather than guessing a date.
_Avoid_: draft, scheduled, pending

**Pinned**:
A Post carrying `pin`, which the Blog lists ahead of every unpinned Post and marks with
a badge. The mark's number is a weight among the Pinned; it is never shown, because a
reader needs to know _that_ a Post is pinned, not how the Pinned are ranked.
_Avoid_: sticky, featured, top post

**Order**:
A Post's stated sorting priority, descending. It settles one day under date ordering and
orders the whole Blog under global ordering, so its rank changes with the mode rather
than its meaning.
_Avoid_: rank, weight, priority

**Global Ordering**:
The `sort: 'global'` mode, in which `order` orders the whole Blog and is therefore
required of every Post: a Post without one has no place, and so is Unplaced.
_Avoid_: custom sort, manual order

**Unplaced**:
A Post candidate stating no `order` under global ordering. It renders, but it belongs to
no Blog and no Feed, because ordering the Blog by `order` has nowhere to put it. The
Theme tells the author about it rather than guessing a position.
_Avoid_: unordered, unranked, unsorted

**Theme Config**:
The Site's parameterisation of the Theme, supplied under `themeConfig.blog` in the
Site's VitePress config. Site identity, navigation, Collection Scope and Feed
settings are all Theme Config.
_Avoid_: options, settings, props

**Markdown Feature**:
A Theme capability a Site switches on through VitePress's own markdown options — `markdown.tabs`
for Tabs — rather than through Theme Config, because it changes how Markdown is read rather than
what the Site says about itself. Tabs are the first.
_Avoid_: plugin, extension, option

**Feed**:
The RSS representation of a Site's Blog, generated at build time.
_Avoid_: RSS, atom, syndication

### Writing a Post

**Tab**:
One panel in a Tab Group, carrying the title a reader selects it by, written after an `@tab`
marker.
_Avoid_: panel, section, sheet

**Tab Group**:
The set of Tabs one `tabs` container holds, of which a reader sees one at a time.
_Avoid_: tabs block, widget

**Tab Id**:
The `#id` a Tab Group may state. Tab Groups stating the same one switch together, so the reader
chooses once for all of them; a Tab Group stating none stands alone. The binding holds while the
reader stays on the page.
_Avoid_: name, key, anchor

**Tab Value**:
The `#value` a Tab may state. Linked Tab Groups stay on the Tab carrying the same Tab Value, so a
title that differs between them — or is written in another language — still names the same
choice; a Tab stating none is identified by its title.
_Avoid_: key, slug, anchor

**Code Group**:
A set of code blocks a reader sees one at a time, written in VitePress's `::: code-group` form
with each fence stating its title in brackets. VitePress parses it and switches it; the Theme
styles it. It is not a Tab Group: its panels are code, not Markdown or Vue.
_Avoid_: code tabs, code block group, hope code-group

### Reading a Post

**TOC**:
The list of a Post's headings by which a reader jumps around within it. It is the
Theme's page chrome, not the Post's content: the `[[TOC]]` container a Post may write
into its own Markdown is VitePress's, and renders inside the prose.
_Avoid_: outline, sidebar, index

**Neighbour**:
The Post immediately after or before a Post on the Blog's sorting key — what its Next and
Previous links point at. A Pinned Post keeps the position its key gives it, and the listing's
direction does not change which neighbour is which.
_Avoid_: adjacent post, prev/next pointer

**Listing Direction**:
The end of the Blog's subject key that the index starts from, `desc` by default. It turns the
index and nothing else: Neighbours and labels are the same in either direction.
_Avoid_: reverse order, ascending sort

### Scaffolding

**Scaffolder**:
The `create-vitepress-theme-vuejsblog` package, which writes a new Site's first files —
Theme Config, sample content, brand colour and deploy config. It produces a Site and
owns no content of its own.
_Avoid_: template, starter, boilerplate, generator

**Generated Site**:
A Site the Scaffolder wrote. From its first commit it belongs to its author, and the
Scaffolder has no further part in it.
_Avoid_: scaffold, project template, output

### Authorship

**Author**:
A natural person credited for a Post. A Post may have several.
_Avoid_: writer, contributor, user

**Default Author**:
The Author the Theme substitutes for a Post that credits none.
_Avoid_: fallback author, site author, owner

**Author Scope**:
A content directory whose Posts receive a Default Author different from the Site's.
_Avoid_: region, domain, area, section

**Social Link**:
A place on the web that identifies an Author — an account, an address, or a page. A
byline presents an Author's Social Links as a row of icons.
_Avoid_: contact, profile, social media, link

**Handle**:
An Author's account name on a platform, as distinct from the URL it resolves to. Some
fields carry a Handle and the Theme builds the URL; the Theme never derives a Handle
from a URL.
_Avoid_: username, id, slug

**Custom Social Link**:
A Social Link for a platform the Theme does not know, so the Site states its icon and
label itself.
_Avoid_: other, extra, misc
