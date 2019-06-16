const NewsAPI = require('newsapi')
const fetch = require('fetch')
const { createHash } = require('crypto')
const jsonfile = require('jsonfile')
const fs = require('fs')
const { parse } = require('parse5')
const { exec } = require('child_process')
const { filter, each, find, map, countBy, sumBy } = require('lodash')
const apikey = process.argv[2]
if (apikey === undefined) return console.error('News API key must be first argument')
const newsapi = new NewsAPI(apikey)

async function getLinkage(sentence) {
    return new Promise((resolve, reject) => {
        exec('./parse "' + sentence + '"', { cwd: './link' }, (err, stdout, stderr) => {
            if (err) {
              reject(err)
              return;
            }
            resolve(JSON.parse(stdout))
        });
    })
}

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

function getArticleData(article, body, keywords) {
    const keywordTests = map(keywords, (kw) => new RegExp('.*' + kw + '.*', 'g'))
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
    return {
        articleName: article.source.name,
        articleUrl: article.url,
        qoutes,
        keywords: filter(articlekeywords, (kw) => kw.occurrences > 0)
    }
}


if (!fs.existsSync('./data')) {
    fs.mkdirSync('./data')
}

if (!fs.existsSync('./data/queries')) {
    fs.mkdirSync('./data/queries')
}

if (!fs.existsSync('./data/articles')) {
    fs.mkdirSync('./data/articles')
}

async function makeQuery(keywords) {
    const lastMonth = new Date()
    const articles = []
    lastMonth.setMonth(lastMonth.getMonth())
    const query = {
        q: keywords.join(' '),
        from: `${lastMonth.getFullYear()}-${lastMonth.getMonth()}-${lastMonth.getDate()}`,
        pageSize: 5,
        sortBy: 'relevancy'
    }
    const hash = createHash('md5').update(JSON.stringify(query)).digest('hex').substr(0, 32)
    const queryResults = await new Promise(async (resolve, rej) => {
        const queryPath = `./data/queries/${hash}`
        if (fs.existsSync(queryPath)) {
            const file = jsonfile.readFileSync(queryPath)
            return resolve(file)
        } else {
            const response = await newsapi.v2.everything(query)
            fs.writeFileSync(queryPath, JSON.stringify(response))
            return resolve(response)
        }
    })
    each(queryResults.articles, async (article) => {
        const hash = createHash('md5').update(article.url).digest('hex').substr(0, 32)
        const articlePath = `./data/articles/${hash}`
        const articleResult = await new Promise((resolve, reject) => {
            if (fs.existsSync(articlePath)) {
                const file = jsonfile.readFileSync(articlePath)
                return resolve(file)
            }
            fetch.fetchUrl(article.url, (error, meta, body) => {
                const articleData = getArticleData(article, body, keywords)
                fs.writeFileSync(articlePath, JSON.stringify(articleData))
                return resolve(articleData)
            })
        })
        articles.push(article)
    })
    return articles
}

const keywords = ['president', 'trump', 'antitrust', 'probe', 'google', 'facebook']
// makeQuery(keywords)

async function fn() {
    console.log(await getLinkage("This is working"))
}
fn()

// parser sentence schema
// var a = {
//     sentence: string,
//     words: [
//         {
//             id: number,
//             value: string,
//             links:  [
//                 {
//                     id: number,
//                     domains: string[],
//                     label: string,
//                     rightLabel: string,
//                     leftLabel: string
//                 }
//             ]
//         }
//     ]
// }