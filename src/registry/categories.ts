import type {
    WCAGCategory,
    WCAGPrinciple
} from "../types/index.js";

export const categories = {
    "text-alternatives": {
        id: "1.1",
        name: "Text Alternatives",
        principle: "perceivable"
    },
    "time-based-media": {
        id: "1.2",
        name: "Time-based Media",
        principle: "perceivable"
    },
    "adaptable": {
        id: "1.3",
        name: "Adaptable",
        principle: "perceivable"
    },
    "distinguishable": {
        id: "1.4",
        name: "Distinguishable",
        principle: "perceivable"
    },
    "keyboard-accessible": {
        id: "2.1",
        name: "Keyboard Accessible",
        principle: "operable"
    },
    "enough-time": {
        id: "2.2",
        name: "Enough Time",
        principle: "operable"
    },
    "seizures-and-physical-reactions": {
        id: "2.3",
        name: "Seizures and Physical Reactions",
        principle: "operable"
    },
    "navigable": {
        id: "2.4",
        name: "Navigable",
        principle: "operable"
    },
    "input-modalities": {
        id: "2.5",
        name: "Input Modalities",
        principle: "operable"
    },
    "readable": {
        id: "3.1",
        name: "Readable",
        principle: "understandable"
    },
    "predictable": {
        id: "3.2",
        name: "Predictable",
        principle: "understandable"
    },
    "input-assistance": {
        id: "3.3",
        name: "Input Assistance",
        principle: "understandable"
    },
    "compatible": {
        id: "4.1",
        name: "Compatible",
        principle: "robust"
    }
} as const satisfies Record<WCAGCategory, {
    id: string;
    name: string;
    principle: WCAGPrinciple;
}>;