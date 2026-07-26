import { getFile, putFile } from './_lib/github.js';
import { requireAdmin } from './_lib/auth.js';

const SECTION_START = '<section id="gallery" class="gallery">';

function locateGallerySection(html) {
  const startIdx = html.indexOf(SECTION_START);
  if (startIdx === -1) throw new Error('Could not find gallery section in index.html');
  const endIdx = html.indexOf('</section>', startIdx);
  if (endIdx === -1) throw new Error('Could not find end of gallery section');
  return { startIdx, endIdx: endIdx + '</section>'.length };
}

function extractSrcs(sectionHtml) {
  const regex = /<img src="([^"]+)" alt="Ayra Holidays travel photo"/g;
  const srcs = [];
  let m;
  while ((m = regex.exec(sectionHtml)) !== null) {
    srcs.push(m[1]);
  }
  return srcs;
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const { content } = await getFile('index.html');
      const { startIdx, endIdx } = locateGallerySection(content);
      const section = content.slice(startIdx, endIdx);
      const srcs = extractSrcs(section);
      return res.status(200).json({ tiles: srcs });
    }

    if (req.method === 'POST') {
      if (!requireAdmin(req, res)) return;
      const { index, newSrc } = req.body || {};
      if (typeof index !== 'number' || !newSrc) {
        return res.status(400).json({ error: 'Expected { index, newSrc }' });
      }

      const { content, sha } = await getFile('index.html');
      const { startIdx, endIdx } = locateGallerySection(content);
      const section = content.slice(startIdx, endIdx);
      const srcs = extractSrcs(section);

      if (index < 0 || index >= srcs.length) {
        return res.status(400).json({ error: 'Tile index out of range' });
      }

      // Replace only the Nth occurrence of the img src within the gallery section.
      let count = -1;
      const regex = /<img src="([^"]+)" alt="Ayra Holidays travel photo"/g;
      const newSection = section.replace(regex, (match, oldSrc) => {
        count += 1;
        if (count === index) {
          return match.replace(`src="${oldSrc}"`, `src="${newSrc}"`);
        }
        return match;
      });

      const newContent = content.slice(0, startIdx) + newSection + content.slice(endIdx);
      await putFile('index.html', newContent, sha, `admin: update gallery tile ${index + 1}`);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
