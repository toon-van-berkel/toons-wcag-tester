import type { Locator } from "playwright";

import type { ElementBounds } from "../../types/element.js";

export interface DOMVisibilityResult {
    connected: boolean;

    // CSS visibility
    displayNone: boolean;
    visibilityHidden: boolean;
    opacityZero: boolean;
    contentVisibilityHidden: boolean;
    potentiallyClipped: boolean;

    // HTML and ARIA attributes
    hiddenAttribute: boolean;
    ariaHidden: boolean;
    inert: boolean;

    // Geometry
    bounds: ElementBounds;
    hasDimensions: boolean;
    inViewport: boolean;
    viewportIntersectionRatio: number;

    // Computed values
    display: string;
    visibility: string;
    opacity: number;
    effectiveOpacity: number;

    // Derived indicators
    potentiallyRendered: boolean;
    potentiallyVisible: boolean;
    potentiallyExcludedFromAccessibilityTree: boolean;
}

export class DOMVisibilityEngine {
    async inspect(
        locator: Locator
    ): Promise<DOMVisibilityResult> {
        return locator.evaluate(
            (element): DOMVisibilityResult => {
                const view = element.ownerDocument.defaultView;

                if (!view) {
                    throw new Error(
                        "Element has no associated browser window."
                    );
                }

                const style = view.getComputedStyle(element);

                let displayNone = false;
                let opacityZero = false;
                let contentVisibilityHidden = false;
                let potentiallyClipped = false;

                let hiddenAttribute = false;
                let ariaHidden = false;
                let inert = false;

                let effectiveOpacity = 1;

                function getParent(
                    target: Element
                ): Element | null {
                    if (target.assignedSlot) {
                        return target.assignedSlot;
                    }

                    if (target.parentElement) {
                        return target.parentElement;
                    }

                    const root = target.getRootNode();

                    if (root instanceof ShadowRoot) {
                        return root.host;
                    }

                    return null;
                }

                let current: Element | null = element;

                while (current) {
                    const currentStyle =
                        view.getComputedStyle(current);

                    if (currentStyle.display === "none") {
                        displayNone = true;
                    }

                    const currentOpacity =
                        Number.parseFloat(currentStyle.opacity);

                    if (Number.isFinite(currentOpacity)) {
                        effectiveOpacity *= currentOpacity;
                    }

                    if (currentOpacity === 0) {
                        opacityZero = true;
                    }

                    if (
                        current !== element &&
                        currentStyle.contentVisibility === "hidden"
                    ) {
                        contentVisibilityHidden = true;
                    }

                    if (
                        currentStyle.clip !== "auto" ||
                        currentStyle.clipPath !== "none"
                    ) {
                        potentiallyClipped = true;
                    }

                    if (current.hasAttribute("hidden")) {
                        hiddenAttribute = true;
                    }

                    if (
                        current.getAttribute("aria-hidden") === "true"
                    ) {
                        ariaHidden = true;
                    }

                    if (current.hasAttribute("inert")) {
                        inert = true;
                    }

                    current = getParent(current);
                }

                const visibilityHidden =
                    style.visibility === "hidden" ||
                    style.visibility === "collapse";

                const rect = element.getBoundingClientRect();

                const bounds: ElementBounds = {
                    x: rect.x,
                    y: rect.y,
                    width: rect.width,
                    height: rect.height
                };

                const hasDimensions =
                    rect.width > 0 &&
                    rect.height > 0;

                const viewportWidth = view.innerWidth;
                const viewportHeight = view.innerHeight;

                const intersectionWidth = Math.max(
                    0,
                    Math.min(rect.right, viewportWidth) -
                    Math.max(rect.left, 0)
                );

                const intersectionHeight = Math.max(
                    0,
                    Math.min(rect.bottom, viewportHeight) -
                    Math.max(rect.top, 0)
                );

                const intersectionArea =
                    intersectionWidth * intersectionHeight;

                const elementArea =
                    rect.width * rect.height;

                const viewportIntersectionRatio =
                    elementArea > 0
                        ? Math.min(
                            1,
                            intersectionArea / elementArea
                        )
                        : 0;

                const inViewport =
                    viewportIntersectionRatio > 0;

                const connected = element.isConnected;

                const potentiallyRendered =
                    connected &&
                    !displayNone &&
                    !visibilityHidden &&
                    !contentVisibilityHidden;

                const potentiallyVisible =
                    potentiallyRendered &&
                    hasDimensions &&
                    !opacityZero &&
                    effectiveOpacity > 0 &&
                    inViewport;

                const potentiallyExcludedFromAccessibilityTree =
                    !connected ||
                    displayNone ||
                    visibilityHidden ||
                    contentVisibilityHidden ||
                    ariaHidden ||
                    inert;

                return {
                    connected,

                    displayNone,
                    visibilityHidden,
                    opacityZero,
                    contentVisibilityHidden,
                    potentiallyClipped,

                    hiddenAttribute,
                    ariaHidden,
                    inert,

                    bounds,
                    hasDimensions,
                    inViewport,
                    viewportIntersectionRatio,

                    display: style.display,
                    visibility: style.visibility,
                    opacity: Number.parseFloat(style.opacity),
                    effectiveOpacity,

                    potentiallyRendered,
                    potentiallyVisible,
                    potentiallyExcludedFromAccessibilityTree
                };
            }
        );
    }
}