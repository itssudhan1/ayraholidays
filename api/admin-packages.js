import { getFile, putFile } from './_lib/github.js';
import { requireAdmin } from './_lib/auth.js';

const START_MARKER = 'const packages = [';
const END_ANCHOR = '\n  const catLabels = {';

function extractPackages(html) {
  const startIdx = html.indexOf(START_MARKER);
  if (startIdx === -1) throw new Error('Could not find packages array in index.html');
  const anchorIdx = html.indexOf(END_ANCHOR, startIdx);
  if (anchorIdx === -1) throw new Error('Could not find end anchor after packages array');

  // Walk back from anchorIdx to the closing "];" of the array.
  const between = html.slice(startIdx, anchorIdx);
  const closeIdx = between.lastIndexOf('];');
  if (closeIdx === -1) throw new Error('Could not find closing "];" for packages array');

  const arrayLiteralStart = startIdx + START_MARKER.length - 1; // position of the "["
  const arrayLiteralEnd = startIdx + closeIdx + 1; // position right after the "]"
  const arrayText = html.slice(arrayLiteralStart, arrayLiteralEnd);

  // The array is a JS object literal (unquoted keys), not strict JSON — evaluate it safely
  // in an isolated function scope. This runs only on our own trusted repo content.
  // eslint-disable-next-line no-new-func
  const packages = new Function(`return ${arrayText};`)();

  return {
    packages,
    prefix: html.slice(0, arrayLiteralStart),
    suffix: html.slice(arrayLiteralEnd)
  };
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const { content } = await getFile('index.html');
      const { packages } = extractPackages(content);
      return res.status(200).json({ packages });
    }

    if (req.method === 'POST') {
      if (!requireAdmin(req, res)) return;
      const { packages: newPackages } = req.body || {};
      if (!Array.isArray(newPackages)) {
        return res.status(400).json({ error: 'Expected { packages: [...] }' });
      }

      const { content, sha } = await getFile('index.html');
      const { prefix, suffix } = extractPackages(content);

      const newArrayText = JSON.stringify(newPackages, null, 2);
      const newContent = `${prefix}${newArrayText}${suffix}`;

      await putFile('index.html', newContent, sha, 'admin: update tour packages');
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
