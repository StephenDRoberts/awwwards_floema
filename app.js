const logger = require('morgan')
const express = require('express')
const errorHandler = require('errorhandler')
const bodyParser = require('body-parser')
const methodOverride = require('method-override')

const app = express()
const path = require('path')
const port = 3000
const Prismic = require('@prismicio/client')
const PrismicDom = require('prismic-dom')

require('dotenv').config()

const apiEndpoint = process.env.PRISMIC_ENDPOINT
const token = process.env.PROSMIC_ACCESS_TOKEN

app.use(logger('dev'))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))
app.use(methodOverride())
app.use(errorHandler())
app.use(express.static(path.join(__dirname, 'public')))

const initApi = req => {
  return Prismic.getApi(apiEndpoint, {
    accessToken: token,
    req
  })
}

const handleLinkResolver = (doc) => {
  if (doc.type === 'product') {
    return `/detail/${doc.slug}`
  }

  if (doc.type === 'about') {
    return `/about`
  }

  if (doc.type === 'collections') {
    return `/collection`
  }

  return '/'
}

app.use((req, res, next) => {
  res.locals.Link = handleLinkResolver
  res.locals.PrismicDom = PrismicDom
  res.locals.Numbers = index => {
    return index == 0 ? "One" : index == 1 ? "Two" :index == 2 ? "Three" : index == 3 ? "Four" : ""
  }
  next()
})

app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'pug')

const handleRequest = async api => {
  const meta = await api.getSingle('metadata')
  const navigation = await api.getSingle('navigation')
  const preloader = await api.getSingle('preloader')

  return {
      meta,
      navigation,
      preloader
  }
}

app.get('/', async (req, res) => {
  const api = await initApi(req)
  const defaults = await handleRequest(api)
  const home = await api.getSingle('home')

  const { results: collections } = await api.query(Prismic.Predicates.at('document.type', 'collection'), {
    fetchLinks: 'product.image'
  })

  res.render('pages/home', {
    ...defaults,
    home,
    collections
  })
})

app.get('/about', async (req, res) => {
  const api = await initApi(req)
  const defaults = await handleRequest(api)
  const about = await api.getSingle('about')


  res.render('pages/about', {
    ...defaults,
    about
  })
})

app.get('/detail/:uid', async (req, res) => {
  const uid = req.params.uid
  const defaults = await handleRequest(api)
  const api = await initApi(req)

  const product = await api.getByUID('product', uid, {
    fetchLinks: 'collection.title'
  })
  res.render('pages/detail', {
    ...defaults,
    product
  })
})

app.get('/collection', async (req, res) => {
  const api = await initApi(req)
  const defaults = await handleRequest(api)
  const home = await api.getSingle('home')

  const { results: collections } = await api.query(
    Prismic.Predicates.at('document.type', 'collection'), {
      fetchLinks: 'product.image'
    })

  res.render('pages/collection', {
    ...defaults,
    collections,
    home
  })
})

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})
