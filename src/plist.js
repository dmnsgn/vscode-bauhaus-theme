const escape = (text) =>
  text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

function node(value, depth) {
  const pad = "\t".repeat(depth);
  if (Buffer.isBuffer(value))
    return `${pad}<data>${value.toString("base64")}</data>`;
  if (Array.isArray(value))
    return [
      `${pad}<array>`,
      ...value.map((item) => node(item, depth + 1)),
      `${pad}</array>`,
    ].join("\n");
  if (typeof value === "object")
    return [
      `${pad}<dict>`,
      ...Object.entries(value).flatMap(([key, item]) => [
        `${pad}\t<key>${escape(key)}</key>`,
        node(item, depth + 1),
      ]),
      `${pad}</dict>`,
    ].join("\n");
  if (typeof value === "boolean") return `${pad}<${value}/>`;
  if (typeof value === "bigint") return `${pad}<integer>${value}</integer>`;
  return typeof value === "number"
    ? `${pad}<real>${value}</real>`
    : `${pad}<string>${escape(String(value))}</string>`;
}

/**
 * Serialize to an XML property list.
 *
 * @param {unknown} value Objects become dicts, Buffers become data, BigInts
 *   become integers and numbers become reals.
 * @returns {string}
 */
export const plist = (value) => `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
${node(value, 0)}
</plist>
`;
