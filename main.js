const NewsAPI = require('newsapi')
const fetch = require('fetch')
const { parse } = require('parse5')
const { filter, each, find, map, countBy, sumBy } = require('lodash')
const apikey = process.argv[2]
if (apikey === undefined) return console.error('News API key must be first argument')
const newsapi = new NewsAPI(apikey)

function getNodes(document) {
    const nodes = []
    const tagName = 'p'

    function getN(element) {
        if (!element.childNodes && element.tagName !== tagName) return
        if (element.tagName === tagName) {
            const text = find(element.childNodes, (node) => node.nodeName === '#text')
            if (text) {
                nodes.push(text.value)
                return
            }
        }
        each(element.childNodes, (node) => getN(node))
    }
    getN(document)

    return nodes
}

const keywords = ['president', 'trump', 'antitrust', 'probe', 'google', 'facebook']
const keywordTests = map(keywords, (kw) => new RegExp('.*' + kw + '.*', 'g'))
const articles = []
newsapi.v2.everything({
  q: keywords.join(' '),
  from: '2019-05-30',
  pageSize: 5,
  sortBy: 'relevancy'
}).then(response => {
    each(response.articles, (article) => {
        fetch.fetchUrl(article.url, (error, meta, body) => {
            const textNodes = getNodes(parse(body.toString()))
            const articlekeywords = map(keywords, (kw) => ({ keyword: kw, occurrences: 0 }))
            const qoutes = map(filter(textNodes, (node) => find(node.split(' '), (word) => find(keywordTests, (keywordTest) => {
                const sanitizedWord = word.replace(/[^a-zA-Z ]/g, "")
                const hasKeyword = keywordTest.test(sanitizedWord.toLowerCase())
                if (hasKeyword) {
                    for (let i = 0; i < articlekeywords.length;i++) {
                        const kw = articlekeywords[i]
                        if (keywordTest.test(kw.keyword.toLowerCase())) {
                            articlekeywords[i].occurrences++
                        }
                    }
                }
                return hasKeyword
            }))), (qoute) => {
                let kw = filter(map(keywords, (keyword) => ({
                    keyword: keyword,
                    occurrences: countBy(qoute.split(' '), (word) => word === keyword)
                })), (o) => o.occurrences.true)
                kw = map(kw, ({ keyword, occurrences }) => ({
                    keyword,
                    occurrences: occurrences.true
                }))
                return {
                    value: qoute,
                    keywords: kw
                }
            })
            const articleData = {
                articleName: article.source.name,
                articleUrl: article.url,
                qoutes,
                keywords: filter(articlekeywords, (kw) => kw.occurrences > 0)
            }
            articles.push(articleData)
            console.log(articleData)
        })
    })
})