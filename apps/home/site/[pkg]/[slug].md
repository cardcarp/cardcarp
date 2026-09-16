<!--
  Every tree entry with no Markdown page of its own: a page not converted yet
  (rendered from its old component) or a draft (the placeholder). See
  ./[slug].paths.js for which URLs this claims.
-->

<DocLegacy v-if="$params.kind === 'legacy'" :pkg="$params.pkg" :slug="$params.slug === 'index' ? '' : $params.slug" />
<DocDraft v-else :pkg="$params.pkg" :slug="$params.slug === 'index' ? '' : $params.slug" />
