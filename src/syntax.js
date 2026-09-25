/** @typedef {import("./palettes.js").Palette} Palette */

/**
 * Syntax roles, modelled on Community Material Theme High Contrast with Bauhaus
 * hues: Material purple (keywords) → red accent, Material red/coral (params,
 * tags, constants) → violet, other hues keep their role.
 *
 * @param {Palette} p
 */
export const roles = (p) => ({
  text: p.fg.default,
  comment: p.fg.muted,
  keyword: p.ink.red,
  operator: p.ink.cyan,
  function: p.ink.blue,
  type: p.ink.yellow,
  string: p.ink.green,
  constant: p.ink.orange,
  variable: p.ink.violet,
  invalid: p.ink.red,
});

const rule = (name, scope, foreground, fontStyle) => ({
  name,
  scope,
  settings: {
    ...(foreground && { foreground }),
    ...(fontStyle !== undefined && { fontStyle }),
  },
});

// Material cycles JSON key colors per nesting depth.
const jsonKeys = (colors) =>
  colors.map((foreground, depth) =>
    rule(
      `JSON key depth ${depth + 1}`,
      `source.json ${"meta.structure.dictionary.json ".repeat(depth + 1)}support.type.property-name.json`,
      foreground,
    ),
  );

/**
 * TextMate rules. Later rules win on equal specificity.
 *
 * @param {Palette} p
 */
export function tokenColors(p) {
  const r = roles(p);
  return [
    rule(
      "Text",
      [
        "variable",
        "variable.other.readwrite",
        "meta.definition.variable",
        "support.variable.property",
        "variable.other.property",
        "variable.other.object.property",
        "constant.other.color",
        "support.type.property-name.css",
      ],
      r.text,
    ),
    rule(
      "Comment",
      ["comment", "punctuation.definition.comment", "string.quoted.docstring"],
      r.comment,
      "italic",
    ),
    rule(
      "Keyword",
      [
        "keyword",
        "storage.type",
        "storage.modifier",
        "keyword.other.important",
      ],
      r.keyword,
    ),
    rule("Control flow", ["keyword.control"], r.operator, "italic"),
    rule(
      "Operator, punctuation",
      [
        "keyword.operator",
        "punctuation",
        "meta.brace",
        "punctuation.definition.tag",
        "punctuation.separator.inheritance.php",
      ],
      r.operator,
    ),
    rule(
      "Regexp, escape, template",
      [
        "string.regexp",
        "constant.character.escape",
        "keyword.other.template",
        "keyword.other.substitution",
        "punctuation.section.embedded",
        "punctuation.definition.template-expression",
      ],
      r.operator,
    ),
    rule(
      "Function",
      [
        "entity.name.function",
        "variable.function",
        "support.function",
        "meta.function-call entity.name.function",
        "keyword.other.special-method",
        "variable.function.constructor",
      ],
      r.function,
    ),
    rule(
      "Decorator",
      [
        "meta.decorator entity.name.function",
        "meta.decorator variable.other",
        "punctuation.decorator",
        "entity.name.function.decorator",
      ],
      r.function,
      "italic",
    ),
    rule(
      "Type",
      [
        "entity.name",
        "entity.name.type",
        "entity.name.class",
        "entity.name.namespace",
        "support.type",
        "support.class",
        "support.other.namespace",
        "entity.other.attribute-name.class",
        "constant.other.reference.link.markdown",
      ],
      r.type,
    ),
    rule("Inherited class", ["entity.other.inherited-class"], r.type, "italic"),
    rule(
      "String",
      ["string", "constant.other.symbol", "constant.other.key"],
      r.string,
    ),
    rule(
      "Constant",
      [
        "constant.numeric",
        "constant.language",
        "support.constant",
        "constant.character",
        "keyword.other.unit",
        "variable.other.enummember",
      ],
      r.constant,
    ),
    rule(
      "Tag, constant variable",
      [
        "entity.name.tag",
        "meta.tag.sgml",
        "variable.other.constant",
        "support.other.variable",
        "entity.name.tag.css",
      ],
      r.variable,
    ),
    rule(
      "Parameter",
      ["variable.parameter", "meta.parameters variable.other"],
      r.variable,
    ),
    rule(
      "Language variable",
      ["variable.language", "variable.parameter.function.language.special"],
      r.variable,
      "italic",
    ),
    rule("Attribute", ["entity.other.attribute-name"], r.keyword, "italic"),
    rule(
      "CSS id, pseudo",
      [
        "entity.other.attribute-name.id",
        "entity.other.attribute-name.pseudo-class",
        "entity.other.attribute-name.pseudo-element",
      ],
      r.constant,
    ),
    rule("Invalid", ["invalid", "invalid.illegal"], r.invalid, "underline"),
    rule("Deprecated", ["invalid.deprecated"], r.comment, "strikethrough"),
    rule("Link", ["*url*", "*link*", "*uri*"], undefined, "underline"),
    ...jsonKeys([
      r.keyword,
      r.type,
      r.constant,
      r.variable,
      r.function,
      r.string,
    ]),
    rule(
      "Markdown heading",
      [
        "markup.heading",
        "markup.heading entity.name",
        "punctuation.definition.heading.markdown",
      ],
      r.string,
      "bold",
    ),
    rule("Markdown bold", ["markup.bold"], r.variable, "bold"),
    rule("Markdown italic", ["markup.italic"], r.variable, "italic"),
    rule(
      "Markdown strike",
      ["markup.strikethrough"],
      undefined,
      "strikethrough",
    ),
    rule("Markdown code", ["markup.inline.raw", "markup.raw.block"], r.keyword),
    rule("Markdown fenced code", ["markup.fenced_code.block.markdown"], r.text),
    rule("Markdown quote", ["markup.quote"], r.comment, "italic"),
    rule(
      "Markdown link text",
      [
        "string.other.link.title.markdown",
        "string.other.link.description.markdown",
      ],
      r.function,
    ),
    rule("Markdown link url", ["markup.underline.link"], r.operator),
    rule(
      "Markdown list",
      [
        "punctuation.definition.list.begin.markdown",
        "beginning.punctuation.definition.list.markdown",
      ],
      r.operator,
    ),
    rule("Separator", ["meta.separator"], r.comment, "bold"),
    rule("Diff inserted", ["markup.inserted"], r.string),
    rule("Diff deleted", ["markup.deleted"], r.invalid),
    rule("Diff changed", ["markup.changed"], r.type),
  ];
}

/**
 * Semantic tokens refine TextMate where language servers know more (e.g.
 * references to parameters). Unlisted selectors fall back to the TextMate scope
 * mapping.
 *
 * @param {Palette} p
 */
export function semanticTokenColors(p) {
  const r = roles(p);
  return {
    namespace: r.type,
    type: r.type,
    class: r.type,
    interface: r.type,
    enum: r.type,
    struct: r.type,
    typeParameter: { foreground: r.type, italic: true },
    function: r.function,
    method: r.function,
    decorator: { foreground: r.function, italic: true },
    macro: r.constant,
    parameter: r.variable,
    variable: r.text,
    // Material only colors constant declarations; colouring every reference would flood the code.
    "variable.readonly": r.text,
    "variable.readonly.declaration": r.variable,
    "variable.readonly.defaultLibrary": r.constant,
    property: r.text,
    enumMember: r.constant,
    event: r.variable,
    label: r.comment,
    "*.deprecated": { fontStyle: "strikethrough" },
  };
}
