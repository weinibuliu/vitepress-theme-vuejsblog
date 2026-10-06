# External Links carry one class, and the arrow is only decoration

Every External Link the Theme renders carries the same class, `vp-blog-external-link`, and one
switchable arrow is drawn after the text ones. The class is the contract: a Site hangs its own
"you are leaving this Site" prompt off it, so it is applied to every external link in every
region and is never conditional on the arrow. `isExternal` answers the question with a purely
syntactic test — a scheme, or `//` — and `mailto:`, `tel:`, `javascript:` and `#` are not
External Links. This is deliberately a different question from the `external` flag in Theme
Config, which keeps VitePress's client router away from a same-origin file such as the Feed and
says nothing about leaving the Site.

The arrow is a decoration with three switches (`nav`, `footer`, `content`), and the switch that
covers a Post's Markdown cannot be applied where the class is: `markdown.externalLinks` runs
while VitePress builds the page, before Theme Config is resolved. So the switches are stated as
classes on the Layout shell and the arrow is turned off in CSS — which is also what keeps the
class on the link while the decoration goes away. A link whose own content is an icon (a nav
entry with an `icon`, an Author's avatar, a Social Link) carries the class and draws no arrow.

## Considered Options

- **Compare origins, as the Theme first did.** `new URL(href, location.href).origin !==
location.origin` is the accurate reading, but VitePress renders every page on the server
  first and Node has no `location`: the thrown `ReferenceError` was swallowed, every link was
  read as internal in the HTML, and the browser corrected it on hydration — a mismatch, and a
  first paint with no arrow. Making it accurate would mean handing the Theme the Site's origin
  through Theme Config, a new required field that is absent in exactly the case (a relative
  `base`) where the answer is least useful.
- **Follow the link's `external` flag.** It is what the nav and footer already carried, and it
  is why the Theme put an arrow on `/feed.rss` — a file the Site itself ships. An arrow there
  claims the reader is leaving the Blog when following the link does nothing of the kind, and
  it would fire a Site's redirect prompt for the same false reason.
- **One class per region**, `vp-blog-nav-external-link` and the like. Rejected: a Site's
  redirect prompt would have to know every region, and a region added later would silently
  escape it. Region differences are style, and style can hang off the containers that already
  exist.
- **Let VitePress's own rule draw the arrows in a Post.** `vp-doc.css` already has an
  external-link rule, switched on for the default theme by `external-link-icon-enabled`. It
  cannot be used here: it reads `target="_blank"`, and VitePress's markdown plugin puts that on
  `mailto:` links and on any link a Site forced to a new tab — so the Theme would be marking
  links it has just decided are not External Links.
- **Gate the Markdown class at build time.** Impossible without changing how a Site calls
  `blogConfig`, because Theme Config is not resolved when `config.js` is read.

## Consequences

- `vp-blog-external-link` is a stable public name, and the rules that add it are stated in one
  place (`lib/externalLinks.ts`) so the base config and the templates cannot drift. A test
  pins the string.
- VitePress only sets an attribute a token does not already carry, so a link written with a
  class of its own — `[x](https://x.com){.plain}` — keeps that class and does not get the
  hook. It is the one way an external link can end up unmarked.
- A same-origin URL written out in full is read as external, and a Site's redirect prompt will
  offer to intercept a link that stays on the Blog. Nothing at build time can tell the
  difference, and this is the price of the arrow being right in the server-rendered HTML.
- `footer.text` and `hero.subtext` are raw HTML rather than Markdown, so external links inside
  them are never marked. A Site that wants the hook there writes the class itself.
