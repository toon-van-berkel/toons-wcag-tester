import { loadConfig } from "../config/index.js";
import { getEnabledCategories } from "../config/index.js";
import { categories } from "../registry/index.js";

const configPath = process.argv[2];
const config = loadConfig(configPath || undefined);

const matrix = {
    include: getEnabledCategories(config).map(slug => ({
        category: slug,
        id: categories[slug].id,
        name: categories[slug].name,
        principle: categories[slug].principle
    }))
};

console.log(JSON.stringify(matrix));