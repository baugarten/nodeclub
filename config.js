/**
 * config
 */

var path = require('path');

exports.config = {
  debug: true,
  name: 'Austin AcroYoga',
  description: '',
  version: '0.0.1',

  // site settings
  site_headers: [
    '<meta name="author" content="Ben Augarten" />',
  ],
  host: 'localhost',
  hostname: 'localhost',
  site_logo: '', // default is `name`
  site_navs: [
    [ '/etiquette', 'Etiquette']
    // [ path, title, [target=''] ]
    //[ '/about', '关于' ],
  ],
  site_static_host: '',
  mini_assets: false,
  site_enable_search_preview: false,
  site_google_search_domain:  'cnodejs.org',

  upload_dir: path.join(__dirname, 'public', 'user_data', 'images'),

  db: process.env.MONGOLAB_URI || process.env.MONGOHQ_URL || 'mongodb://127.0.0.1/node_club_dev',
  session_secret: 'austin acroyoga sessions secret',
  auth_cookie_name: 'austin_acroyoga',
  port: 3000,

  list_topic_count: 20,

  post_interval: 10000,

  // RSS
  rss: {
    title: 'Austin Acroyoga',
    //link: 'http://cnodejs.org',
    language: 'en-us',
    description: 'Austin Acroyoga',

    max_rss_items: 50
  },
 
  site_links: [
    {
      'text': 'Node 官方网站',
      'url': 'http://nodejs.org/'
    },
    {
      'text': 'Node Party',
      'url': 'http://party.cnodejs.net/'
    },
    {
      'text': 'Node 入门',
      'url': 'http://nodebeginner.org/index-zh-cn.html'
    },
    {
      'text': 'Node 中文文档',
      'url': 'http://docs.cnodejs.net/cman/'
    }
  ],

  // mail SMTP
  mail_opts: {
    service: "Gmail",
    auth: {
      user: 'austin.acroyoga@gmail.com',
      pass: 'austin@acroyoga3726'
    }
  },

  admins: { admin: true },

  // [ { name: 'plugin_name', options: { ... }, ... ]
  plugins: [
    // { name: 'onehost', options: { host: 'localhost.cnodejs.org' } },
    // { name: 'wordpress_redirect', options: {} }
  ]
};
