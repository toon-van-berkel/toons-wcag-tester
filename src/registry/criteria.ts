import type {
    WCAGCriterion,
    WCAGCriterionId,
    WCAGLevel,
    WCAGCategory
} from "../types/index.js";

import { categories } from "./categories.js";

function criterion(
    id: WCAGCriterionId,
    name: string,
    level: WCAGLevel,
    category: WCAGCategory,
    anchor: string,
    description: string
): WCAGCriterion {
    return {
        id,
        name,
        level,
        category,
        principle: categories[category].principle,
        description,
        reference: `https://www.w3.org/TR/WCAG22/#${anchor}`
    };
}

export const criteria: readonly WCAGCriterion[] = [

    // ==================================================
    // 1. PERCEIVABLE
    // ==================================================

    // 1.1 Text Alternatives

    criterion("1.1.1", "Non-text Content", "A",
        "text-alternatives", "non-text-content",
        "Provide accessible alternatives for non-text content."),

    // 1.2 Time-based Media

    criterion("1.2.1", "Audio-only and Video-only (Prerecorded)", "A",
        "time-based-media", "audio-only-and-video-only-prerecorded",
        "Provide alternatives for prerecorded audio-only and video-only content."),

    criterion("1.2.2", "Captions (Prerecorded)", "A",
        "time-based-media", "captions-prerecorded",
        "Provide captions for prerecorded synchronized media."),

    criterion("1.2.3", "Audio Description or Media Alternative (Prerecorded)", "A",
        "time-based-media", "audio-description-or-media-alternative-prerecorded",
        "Provide audio descriptions or equivalent media alternatives."),

    criterion("1.2.4", "Captions (Live)", "AA",
        "time-based-media", "captions-live",
        "Provide captions for live synchronized media."),

    criterion("1.2.5", "Audio Description (Prerecorded)", "AA",
        "time-based-media", "audio-description-prerecorded",
        "Provide audio descriptions for prerecorded video."),

    criterion("1.2.6", "Sign Language (Prerecorded)", "AAA",
        "time-based-media", "sign-language-prerecorded",
        "Provide sign language interpretation."),

    criterion("1.2.7", "Extended Audio Description (Prerecorded)", "AAA",
        "time-based-media", "extended-audio-description-prerecorded",
        "Provide extended audio descriptions when necessary."),

    criterion("1.2.8", "Media Alternative (Prerecorded)", "AAA",
        "time-based-media", "media-alternative-prerecorded",
        "Provide equivalent alternatives for prerecorded media."),

    criterion("1.2.9", "Audio-only (Live)", "AAA",
        "time-based-media", "audio-only-live",
        "Provide equivalent alternatives for live audio-only content."),

    // 1.3 Adaptable

    criterion("1.3.1", "Info and Relationships", "A",
        "adaptable", "info-and-relationships",
        "Expose information, structure and relationships accessibly."),

    criterion("1.3.2", "Meaningful Sequence", "A",
        "adaptable", "meaningful-sequence",
        "Preserve meaningful reading sequences."),

    criterion("1.3.3", "Sensory Characteristics", "A",
        "adaptable", "sensory-characteristics",
        "Avoid instructions relying solely on sensory characteristics."),

    criterion("1.3.4", "Orientation", "AA",
        "adaptable", "orientation",
        "Support different display orientations."),

    criterion("1.3.5", "Identify Input Purpose", "AA",
        "adaptable", "identify-input-purpose",
        "Expose the purpose of applicable input fields."),

    criterion("1.3.6", "Identify Purpose", "AAA",
        "adaptable", "identify-purpose",
        "Expose the purpose of interface elements and regions."),

    // 1.4 Distinguishable

    criterion("1.4.1", "Use of Color", "A",
        "distinguishable", "use-of-color",
        "Avoid communicating information through color alone."),

    criterion("1.4.2", "Audio Control", "A",
        "distinguishable", "audio-control",
        "Provide controls for applicable automatically playing audio."),

    criterion("1.4.3", "Contrast (Minimum)", "AA",
        "distinguishable", "contrast-minimum",
        "Meet minimum text contrast requirements."),

    criterion("1.4.4", "Resize Text", "AA",
        "distinguishable", "resize-text",
        "Support text resizing without losing content or functionality."),

    criterion("1.4.5", "Images of Text", "AA",
        "distinguishable", "images-of-text",
        "Prefer actual text over images of text."),

    criterion("1.4.6", "Contrast (Enhanced)", "AAA",
        "distinguishable", "contrast-enhanced",
        "Meet enhanced text contrast requirements."),

    criterion("1.4.7", "Low or No Background Audio", "AAA",
        "distinguishable", "low-or-no-background-audio",
        "Minimize competing background audio."),

    criterion("1.4.8", "Visual Presentation", "AAA",
        "distinguishable", "visual-presentation",
        "Support accessible customization of text presentation."),

    criterion("1.4.9", "Images of Text (No Exception)", "AAA",
        "distinguishable", "images-of-text-no-exception",
        "Restrict images of text to permitted uses."),

    criterion("1.4.10", "Reflow", "AA",
        "distinguishable", "reflow",
        "Support reflow without unnecessary two-dimensional scrolling."),

    criterion("1.4.11", "Non-text Contrast", "AA",
        "distinguishable", "non-text-contrast",
        "Provide sufficient contrast for relevant non-text elements."),

    criterion("1.4.12", "Text Spacing", "AA",
        "distinguishable", "text-spacing",
        "Support text spacing adjustments."),

    criterion("1.4.13", "Content on Hover or Focus", "AA",
        "distinguishable", "content-on-hover-or-focus",
        "Make additional hover and focus content accessible."),

    // ==================================================
    // 2. OPERABLE
    // ==================================================

    // 2.1 Keyboard Accessible

    criterion("2.1.1", "Keyboard", "A",
        "keyboard-accessible", "keyboard",
        "Support keyboard operation of functionality."),

    criterion("2.1.2", "No Keyboard Trap", "A",
        "keyboard-accessible", "no-keyboard-trap",
        "Prevent keyboard focus from becoming trapped."),

    criterion("2.1.3", "Keyboard (No Exception)", "AAA",
        "keyboard-accessible", "keyboard-no-exception",
        "Support all functionality through keyboard operation."),

    criterion("2.1.4", "Character Key Shortcuts", "A",
        "keyboard-accessible", "character-key-shortcuts",
        "Provide safeguards for character-only shortcuts."),

    // 2.2 Enough Time

    criterion("2.2.1", "Timing Adjustable", "A",
        "enough-time", "timing-adjustable",
        "Provide appropriate control over time limits."),

    criterion("2.2.2", "Pause, Stop, Hide", "A",
        "enough-time", "pause-stop-hide",
        "Provide control over applicable moving or updating content."),

    criterion("2.2.3", "No Timing", "AAA",
        "enough-time", "no-timing",
        "Avoid unnecessary time-dependent interactions."),

    criterion("2.2.4", "Interruptions", "AAA",
        "enough-time", "interruptions",
        "Allow users to manage non-emergency interruptions."),

    criterion("2.2.5", "Re-authenticating", "AAA",
        "enough-time", "re-authenticating",
        "Preserve user activity after re-authentication."),

    criterion("2.2.6", "Timeouts", "AAA",
        "enough-time", "timeouts",
        "Inform users about applicable inactivity timeouts."),

    // 2.3 Seizures and Physical Reactions

    criterion("2.3.1", "Three Flashes or Below Threshold", "A",
        "seizures-and-physical-reactions",
        "three-flashes-or-below-threshold",
        "Avoid flashing content above permitted thresholds."),

    criterion("2.3.2", "Three Flashes", "AAA",
        "seizures-and-physical-reactions", "three-flashes",
        "Restrict flashing frequency."),

    criterion("2.3.3", "Animation from Interactions", "AAA",
        "seizures-and-physical-reactions",
        "animation-from-interactions",
        "Allow non-essential interaction animations to be disabled."),

    // 2.4 Navigable

    criterion("2.4.1", "Bypass Blocks", "A",
        "navigable", "bypass-blocks",
        "Provide mechanisms to bypass repeated content."),

    criterion("2.4.2", "Page Titled", "A",
        "navigable", "page-titled",
        "Provide descriptive page titles."),

    criterion("2.4.3", "Focus Order", "A",
        "navigable", "focus-order",
        "Maintain meaningful keyboard focus order."),

    criterion("2.4.4", "Link Purpose (In Context)", "A",
        "navigable", "link-purpose-in-context",
        "Expose meaningful link purposes within context."),

    criterion("2.4.5", "Multiple Ways", "AA",
        "navigable", "multiple-ways",
        "Provide multiple applicable page discovery mechanisms."),

    criterion("2.4.6", "Headings and Labels", "AA",
        "navigable", "headings-and-labels",
        "Use descriptive headings and labels."),

    criterion("2.4.7", "Focus Visible", "AA",
        "navigable", "focus-visible",
        "Provide visible keyboard focus indicators."),

    criterion("2.4.8", "Location", "AAA",
        "navigable", "location",
        "Expose the user's location within a website."),

    criterion("2.4.9", "Link Purpose (Link Only)", "AAA",
        "navigable", "link-purpose-link-only",
        "Make link purposes understandable independently."),

    criterion("2.4.10", "Section Headings", "AAA",
        "navigable", "section-headings",
        "Organize content using section headings."),

    criterion("2.4.11", "Focus Not Obscured (Minimum)", "AA",
        "navigable", "focus-not-obscured-minimum",
        "Prevent focused components from being entirely obscured."),

    criterion("2.4.12", "Focus Not Obscured (Enhanced)", "AAA",
        "navigable", "focus-not-obscured-enhanced",
        "Prevent focused components from being obscured."),

    criterion("2.4.13", "Focus Appearance", "AAA",
        "navigable", "focus-appearance",
        "Meet focus indicator appearance requirements."),

    // 2.5 Input Modalities

    criterion("2.5.1", "Pointer Gestures", "A",
        "input-modalities", "pointer-gestures",
        "Provide alternatives to complex pointer gestures."),

    criterion("2.5.2", "Pointer Cancellation", "A",
        "input-modalities", "pointer-cancellation",
        "Support safe pointer activation and cancellation."),

    criterion("2.5.3", "Label in Name", "A",
        "input-modalities", "label-in-name",
        "Include visible labels in accessible names."),

    criterion("2.5.4", "Motion Actuation", "A",
        "input-modalities", "motion-actuation",
        "Provide alternatives to motion-based controls."),

    criterion("2.5.5", "Target Size (Enhanced)", "AAA",
        "input-modalities", "target-size-enhanced",
        "Meet enhanced pointer target size requirements."),

    criterion("2.5.6", "Concurrent Input Mechanisms", "AAA",
        "input-modalities", "concurrent-input-mechanisms",
        "Avoid unnecessary restrictions on input mechanisms."),

    criterion("2.5.7", "Dragging Movements", "AA",
        "input-modalities", "dragging-movements",
        "Provide alternatives to dragging interactions."),

    criterion("2.5.8", "Target Size (Minimum)", "AA",
        "input-modalities", "target-size-minimum",
        "Meet minimum pointer target size requirements."),

    // ==================================================
    // 3. UNDERSTANDABLE
    // ==================================================

    // 3.1 Readable

    criterion("3.1.1", "Language of Page", "A",
        "readable", "language-of-page",
        "Expose the primary page language."),

    criterion("3.1.2", "Language of Parts", "AA",
        "readable", "language-of-parts",
        "Expose language changes within content."),

    criterion("3.1.3", "Unusual Words", "AAA",
        "readable", "unusual-words",
        "Provide explanations for unusual terminology."),

    criterion("3.1.4", "Abbreviations", "AAA",
        "readable", "abbreviations",
        "Provide abbreviation meanings or expansions."),

    criterion("3.1.5", "Reading Level", "AAA",
        "readable", "reading-level",
        "Provide accessible alternatives for complex reading material."),

    criterion("3.1.6", "Pronunciation", "AAA",
        "readable", "pronunciation",
        "Provide pronunciation information when necessary."),

    // 3.2 Predictable

    criterion("3.2.1", "On Focus", "A",
        "predictable", "on-focus",
        "Avoid unexpected context changes on focus."),

    criterion("3.2.2", "On Input", "A",
        "predictable", "on-input",
        "Avoid unexpected context changes during input."),

    criterion("3.2.3", "Consistent Navigation", "AA",
        "predictable", "consistent-navigation",
        "Maintain consistent navigation mechanisms."),

    criterion("3.2.4", "Consistent Identification", "AA",
        "predictable", "consistent-identification",
        "Identify equivalent functionality consistently."),

    criterion("3.2.5", "Change on Request", "AAA",
        "predictable", "change-on-request",
        "Provide user control over context changes."),

    criterion("3.2.6", "Consistent Help", "A",
        "predictable", "consistent-help",
        "Present recurring help mechanisms consistently."),

    // 3.3 Input Assistance

    criterion("3.3.1", "Error Identification", "A",
        "input-assistance", "error-identification",
        "Identify and describe input errors."),

    criterion("3.3.2", "Labels or Instructions", "A",
        "input-assistance", "labels-or-instructions",
        "Provide appropriate input labels and instructions."),

    criterion("3.3.3", "Error Suggestion", "AA",
        "input-assistance", "error-suggestion",
        "Provide appropriate suggestions for correcting errors."),

    criterion("3.3.4", "Error Prevention (Legal, Financial, Data)", "AA",
        "input-assistance", "error-prevention-legal-financial-data",
        "Provide safeguards for consequential submissions."),

    criterion("3.3.5", "Help", "AAA",
        "input-assistance", "help",
        "Provide context-sensitive help."),

    criterion("3.3.6", "Error Prevention (All)", "AAA",
        "input-assistance", "error-prevention-all",
        "Provide safeguards for applicable submissions."),

    criterion("3.3.7", "Redundant Entry", "A",
        "input-assistance", "redundant-entry",
        "Avoid unnecessary repeated data entry."),

    criterion("3.3.8", "Accessible Authentication (Minimum)", "AA",
        "input-assistance", "accessible-authentication-minimum",
        "Provide accessible authentication mechanisms."),

    criterion("3.3.9", "Accessible Authentication (Enhanced)", "AAA",
        "input-assistance", "accessible-authentication-enhanced",
        "Meet enhanced accessible authentication requirements."),

    // ==================================================
    // 4. ROBUST
    // ==================================================

    // 4.1 Compatible

    criterion("4.1.2", "Name, Role, Value", "A",
        "compatible", "name-role-value",
        "Expose accessible component names, roles and values."),

    criterion("4.1.3", "Status Messages", "AA",
        "compatible", "status-messages",
        "Expose status messages to assistive technologies.")
];