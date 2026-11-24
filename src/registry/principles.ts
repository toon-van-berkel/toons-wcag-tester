import type { WCAGPrinciple } from "../types/index.js";

export const principles = {
    perceivable: {
        id: "1",
        name: "Perceivable",
        slug: "perceivable"
    },
    operable: {
        id: "2",
        name: "Operable",
        slug: "operable"
    },
    understandable: {
        id: "3",
        name: "Understandable",
        slug: "understandable"
    },
    robust: {
        id: "4",
        name: "Robust",
        slug: "robust"
    }
} as const satisfies Record<WCAGPrinciple, {
    id: string;
    name: string;
    slug: WCAGPrinciple;
}>;