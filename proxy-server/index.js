// const express   = require('express');
// const cors      = require('cors');
// const puppeteer = require('puppeteer');

// const app  = express();
// const PORT = 3001;

// app.use(cors());

// // ─── Sadə yaddaş keşi ────────────────────────
// const cache = new Map();
// const CACHE_TTL = 5 * 60 * 1000;

// const getCache = (key) => {
//   const item = cache.get(key);
//   if (!item) return null;
//   if (Date.now() - item.time > CACHE_TTL) { cache.delete(key); return null; }
//   return item.data;
// };
// const setCache = (key, data) => cache.set(key, { data, time: Date.now() });

// // ─── Brauzer idarəsi ──────────────────────────
// let browser = null;

// const getBrowser = async () => {
//   if (!browser || !browser.isConnected()) {
//     browser = await puppeteer.launch({
//       headless: 'new',
//       args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
//     });
//   }
//   return browser;
// };

// const newPage = async () => {
//   const b  = await getBrowser();
//   const pg = await b.newPage();
//   await pg.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36');
//   await pg.setRequestInterception(true);
//   pg.on('request', (req) => {
//     const type = req.resourceType();
//     if (['stylesheet', 'font', 'media'].includes(type)) {
//       req.abort();
//     } else {
//       req.continue();
//     }
//   });
//   return pg;
// };

// // ─── Siyahı səhifəsini parse et ──────────────
// const scrapListPage = async (cat, page) => {
//   const cacheKey = `list_${cat}_${page}`;
//   const cached   = getCache(cacheKey);
//   if (cached) return cached;

//   const pg = await newPage();

//   try {
//     await pg.goto(`https://cascfen.net/?cat=${cat}&paged=${page}`, {
//       waitUntil: 'networkidle0',
//       timeout:   60000,
//     });

//     await pg.waitForSelector('article, .post, .hentry', { timeout: 15000 }).catch(() => {});

//     await pg.evaluate(() => {
//       document.querySelectorAll('img[data-src], img[data-lazy-src]').forEach(img => {
//         const src = img.getAttribute('data-src') || img.getAttribute('data-lazy-src');
//         if (src) img.src = src;
//       });
//     });

//     const result = await pg.evaluate(() => {
//       const articles = [];
//       const items    = document.querySelectorAll('article, .post, .hentry, .type-post');

//       items.forEach((el) => {
//         const titleEl = el.querySelector('h2 a, h3 a, h1 a, .entry-title a');
//         const title   = titleEl?.innerText?.trim() || '';
//         const link    = titleEl?.href || '';
//         if (!title || !link) return;

//         const id = link.match(/[?&]p=(\d+)/)?.[1] || link;

//         let image = null;
//         const imgEl = el.querySelector('img');
//         if (imgEl) {
//           image = imgEl.getAttribute('data-src')
//                || imgEl.getAttribute('data-lazy-src')
//                || imgEl.getAttribute('data-original')
//                || imgEl.src
//                || null;
//           if (image && (image.includes('data:image') || image.includes('placeholder'))) {
//             image = null;
//           }
//         }

//         const dateEl = el.querySelector('time, .entry-date, .date, .posted-on time, .posted-on');
//         const date   = dateEl?.getAttribute('datetime')?.slice(0, 10)
//                     || dateEl?.innerText?.trim()
//                     || '';

//         const excerptEl = el.querySelector('.entry-summary p, .entry-summary, .excerpt p, .excerpt');
//         const excerpt   = excerptEl?.innerText?.trim().slice(0, 200) || '';

//         const tags = [];
//         el.querySelectorAll('a[rel="category tag"], a[rel="tag"], .cat-links a, .tags-links a, .entry-categories a').forEach(t => {
//           const tag = t.innerText.trim();
//           if (tag) tags.push(tag.toUpperCase());
//         });

//         articles.push({ id, title, link, image, date, excerpt, author: 'CASCFEN', tags });
//       });

//       let totalPages = 1;
//       document.querySelectorAll('.page-numbers').forEach(el => {
//         const n = parseInt(el.innerText.trim());
//         if (!isNaN(n) && n > totalPages) totalPages = n;
//       });

//       return { articles, totalPages };
//     });

//     setCache(cacheKey, result);
//     return result;

//   } finally {
//     await pg.close();
//   }
// };

// // ─── Detal səhifəsini parse et ───────────────
// const scrapDetailPage = async (url) => {
//   const cacheKey = `detail_${url}`;
//   const cached   = getCache(cacheKey);
//   if (cached) return cached;

//   const pg = await newPage();

//   try {
//     await pg.goto(url, {
//       waitUntil: 'networkidle0',
//       timeout:   60000,
//     });

//     await pg.waitForSelector('.entry-content, .post-content', { timeout: 15000 }).catch(() => {});

//     await pg.evaluate(() => {
//       document.querySelectorAll('img[data-src], img[data-lazy-src]').forEach(img => {
//         const src = img.getAttribute('data-src') || img.getAttribute('data-lazy-src');
//         if (src) img.src = src;
//       });
//     });

//     const result = await pg.evaluate(() => {
//       const title  = document.querySelector('h1.entry-title, h1.post-title, article h1, .entry-title')?.innerText?.trim() || '';
//       const dateEl = document.querySelector('time[datetime], .entry-date, .posted-on time');
//       const date   = dateEl?.getAttribute('datetime')?.slice(0, 10) || dateEl?.innerText?.trim() || '';

//       let image = null;
//       const heroImg = document.querySelector('.post-thumbnail img, .entry-thumbnail img, article .wp-post-image, .featured-image img');
//       if (heroImg) {
//         image = heroImg.getAttribute('data-src') || heroImg.getAttribute('data-lazy-src') || heroImg.src || null;
//       }

//       const tags = [];
//       document.querySelectorAll('.tags-links a, .cat-links a, .entry-categories a').forEach(t => {
//         const tag = t.innerText.trim();
//         if (tag) tags.push(tag.toUpperCase());
//       });

//       const sections  = [];
//       const contentEl = document.querySelector('.entry-content, .post-content, article .content, .post-body');

//       if (contentEl) {
//         contentEl.childNodes.forEach((node) => {
//           if (node.nodeType !== 1) return;
//           const tag  = node.tagName?.toLowerCase();
//           const text = node.innerText?.replace(/\s+/g, ' ').trim() || '';

//           if (tag === 'p' && text) {
//             sections.push({ type: 'text', content: text });

//           } else if (['h2', 'h3', 'h4'].includes(tag) && text) {
//             sections.push({ type: 'subtitle', content: text });

//           } else if (tag === 'figure') {
//             const img = node.querySelector('img');
//             if (img) {
//               const src = img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || img.src;
//               if (src && !src.includes('data:image')) {
//                 const caption = node.querySelector('figcaption')?.innerText?.trim() || '';
//                 sections.push({ type: 'image-float', src, caption });
//               }
//             }

//           } else if (tag === 'img') {
//             const src = node.getAttribute('data-src') || node.getAttribute('data-lazy-src') || node.src;
//             if (src && !src.includes('data:image')) {
//               sections.push({ type: 'image', src });
//             }

//           } else if (tag === 'ul' || tag === 'ol') {
//             const items = [...node.querySelectorAll('li')]
//               .map(li => '• ' + li.innerText.trim())
//               .join('\n');
//             if (items) sections.push({ type: 'text', content: items });

//           } else if (tag === 'blockquote' && text) {
//             sections.push({ type: 'text', content: `"${text}"` });

//           } else if (tag === 'div' && text) {
//             node.querySelectorAll('img').forEach(img => {
//               const src = img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || img.src;
//               if (src && !src.includes('data:image')) {
//                 sections.push({ type: 'image', src });
//               }
//             });
//             const pureText = node.innerText?.replace(/\s+/g, ' ').trim();
//             if (pureText && !node.querySelector('img')) {
//               sections.push({ type: 'text', content: pureText });
//             }
//           }
//         });
//       }

//       return { title, image, date, author: 'CASCFEN', tags, sections };
//     });

//     setCache(cacheKey, result);
//     return result;

//   } finally {
//     await pg.close();
//   }
// };

// // ════════════════════════════════════════════
// // GET /news?cat=5&page=1
// // ════════════════════════════════════════════
// app.get('/news', async (req, res) => {
//   const { cat = 5, page = 1 } = req.query;
//   try {
//     const data = await scrapListPage(Number(cat), Number(page));
//     res.json({ ...data, currentPage: Number(page) });
//   } catch (err) {
//     console.error('Siyahı xətası:', err.message);
//     res.status(500).json({ error: err.message, articles: [] });
//   }
// });

// // ════════════════════════════════════════════
// // GET /post?url=https://cascfen.net/?p=1234
// // ════════════════════════════════════════════
// app.get('/post', async (req, res) => {
//   const { url } = req.query;
//   if (!url) return res.status(400).json({ error: 'url parametri lazımdır' });
//   try {
//     const data = await scrapDetailPage(url);
//     res.json(data);
//   } catch (err) {
//     console.error('Detal xətası:', err.message);
//     res.status(500).json({ error: err.message });
//   }
// });

// // ════════════════════════════════════════════
// const startServer = async () => {
//   await getBrowser();
//   app.listen(PORT, () => {
//     console.log(`✅ Proxy server işləyir: http://localhost:${PORT}`);
//     console.log(`   Test: http://localhost:${PORT}/news?cat=5&page=1`);
//   });
// };

// startServer();