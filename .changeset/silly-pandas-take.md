---
"@tealina/doc-ui": patch
---

Build the document page against React 19 and antd 6

The page this package ships is a self-contained bundle — React and antd are compiled into it
rather than taken from the host application — so both move without asking anything of the
app that embeds it. What that app sees change is the page itself: antd 6 restyles a number
of controls, and the bundle now carries React 19 instead of 18.
