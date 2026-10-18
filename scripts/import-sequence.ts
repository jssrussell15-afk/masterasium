import { getCatalog } from "../lib/curriculum/catalog";
import sequenceFile from "../data/curriculum/ontario-g3-sequence.json" with { type: "json" };

const catalog = getCatalog();
const sequence = catalog.sequences[0];
const items = catalog.sequenceItems;
const positions = new Set(items.map((item) => item.position));

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(
    JSON.stringify(
      {
        file: sequenceFile.label,
        label: sequence?.label,
        items: items.length,
        blocks: positions.size,
        published: sequence?.isPublished ?? false,
      },
      null,
      2,
    ),
  );
}

export { items, sequence };
