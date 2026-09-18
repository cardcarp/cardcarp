export const CARD_BACK_VARIANT = 'Flip'
export function hasCardBack(card) {
    return Array.isArray(card?.variation) && card.variation.includes(CARD_BACK_VARIANT)
}
