const NewsAPI = require('newsapi');
const fetch = require('fetch')
const { parse } = require('parse5')
const { filter, each, find, map, countBy, sumBy } = require('lodash')
const newsapi = new NewsAPI('06a1376af2ff4519b88341d291191fe3');

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
                if (keywordTest.test(word.toLowerCase())) find(articlekeywords, (kw) => keywordTest.test(kw.keyword.toLowerCase())).occurrences++
                return keywordTest.test(word.toLowerCase())
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
                keywords: articlekeywords
            }
            articles.push(articleData)
            console.log(articleData)
        })
    })
})