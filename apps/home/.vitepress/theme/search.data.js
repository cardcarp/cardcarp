import { createContentLoader } from 'vitepress'

import { packages, pages } from '../../src/view/doc/tree.js'

export default createContentLoader(packages.map((pkg) => `${pkg}/*.md`), {
    render: true,

    transform(files) {
        const html = new Map(files.map((file) => [file.url, file.html]))

        return Object.fromEntries(packages.map((pkg) => [
            pkg,
            pages(pkg).map((page) => {
                const body = html.get(page.slug ? `/${pkg}/${page.slug}` : `/${pkg}`)
                return { slug: page.slug, name: page.name, sections: body ? sections(body) : [] }
            })
        ]))
    }
})

function sections(html) {
    const parts = html.split(/(<h2 id="[^"]*"[^>]*>[\s\S]*?<\/h2>)/)
    const out = [{ id: '', heading: '', text: text(parts[0]) }]

    for (let i = 1; i < parts.length; i += 2) {
        out.push({
            id: parts[i].match(/id="([^"]*)"/)[1],
            heading: text(parts[i]),
            text: text(parts[i + 1] ?? '')
        })
    }

    return out.filter((section) => section.heading || section.text)
}

function text(html) {
    return decode(html
        .replace(/<a class="header-anchor"[\s\S]*?<\/a>/g, '')
        .replace(/<button[^>]*class="copy"[^>]*><\/button>/g, '')
        .replace(/<span class="lang">[\s\S]*?<\/span>/g, '')
        .replace(/<\/?(p|li|ul|ol|pre|div|h\d|br|hr|table|thead|tbody|tr|td|th|blockquote)\b[^>]*>/g, ' ')
        .replace(/<[^>]+>/g, ''))
        .replace(/\s+/g, ' ')
        .trim()
}

function decode(value) {
    return value
        .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
        .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
}
