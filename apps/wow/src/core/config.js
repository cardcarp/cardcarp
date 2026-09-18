const game = {
    "name": "World of Warcraft",
    "dataset": {
        "source": "cardcarp"
    },
    "card": {
        "size": {
            "width": 63,
            "height": 88
        },
        "table": [
            {
                "key": "name",
                "label": "Name",
                "type": "text",
                "format": "bold"
            },
            {
                "key": "set",
                "label": "Set",
                "type": "text",
                "format": "standard"
            },
            {
                "key": "number",
                "label": "Number",
                "type": "number",
                "format": "number"
            },
            {
                "key": "category",
                "label": "Category",
                "type": "text",
                "format": "tag"
            }
        ],
        "sort": {
            "name": {
                "label": "Name"
            },
            "card_lex": {
                "label": "Set Number"
            },
            "rarity": {
                "label": "Rarity"
            }
        },
        "group": {
            "category": {
                "label": "Type"
            },
            "rarity": {
                "label": "Rarity"
            }
        },
        "filter": {
            "name": {
                "label": "Name",
                "display": true,
                "description": "Filter cards by their name.",
                "type": "input"
            },
            "set_id": {
                "label": "Sets",
                "display": true,
                "description": "Filter cards by their set.",
                "type": "set"
            },
            "category": {
                "label": "Category",
                "display": true,
                "description": "Filter cards by their category.",
                "type": "combo",
                "option": [
                    "Hero",
                    "Master Hero",
                    "Ally",
                    "Equipment",
                    "Quest",
                    "Location",
                    "Token"
                ]
            },
            "publisher": {
                "label": "License",
                "display": true,
                "description": "Filter cards by their publisher.",
                "type": "combo",
                "default": [
                    "Upper Deck",
                    "Cryptozoic"
                ],
                "option": [
                    "Upper Deck",
                    "Cryptozoic",
                    "Reborn"
                ]
            },
            "distinct": {
                "label": "Reprints",
                "display": true,
                "description": "Filter cards by their oracle.",
                "type": "toggle",
                "default": "true",
                "label_true": "Hidden",
                "label_false": "Shown"
            }
        }
    }
}

const deck = {
    "group": {
        "list": [
            "hero",
            "main",
            "side",
            "draft"
        ],
        "default": [
            "hero",
            "main"
        ]
    },
    "table": [
        {
            "key": "name",
            "label": "Name",
            "type": "text",
            "format": "bold"
        },
        {
            "key": "card_total",
            "label": "Cards",
            "type": "number",
            "format": "number"
        },
        {
            "key": "highlight",
            "label": "About",
            "type": "array",
            "format": "card",
            "sort": false
        }
    ],
    "sort": {
        "name": {
            "label": "Name"
        }
    },
    "filter": {}
}

const simulator = {
    "card": {
        "width": 77,
        "height": 108,
        "flip": {
            "deck": [
                "hero"
            ]
        },
        "scry": [
            "Hero",
            "Ally",
            "Equipment",
            "Quest",
            "Location"
        ]
    },
    "table": {
        "surface": {
            "color": "#1a1a1a",
            "img": "bg-table",
            "scale": 0.5,
            "tint": "#6b5f52",
            "alpha": 0.5
        }
    },
    "deal": {
        "player": {
            "seat": {
                "width": 960,
                "height": 534
            },
            "accessory": [
                {
                    "accessory": "Dice (D6)",
                    "x": 608,
                    "y": 46,
                    "start": 15,
                    "variant": "gray"
                },
                {
                    "accessory": "Playmat",
                    "x": 0,
                    "y": 0
                }
            ],
            "deck": {
                "hero": {
                    "x": 505.5,
                    "y": -25.0
                },
                "main": {
                    "x": 617.5,
                    "y": -25.0
                }
            }
        },
        "game": {
            "accessory": []
        }
    },
    "accessory": [
        {
            "name": "Playmat",
            "category": [
                "board"
            ],
            "size": {
                "width": 768,
                "height": 432
            },
            "img": {
                "game": "game/wow/asset/board.avif",
                "thumbnail": "table/board-thumbnail.avif"
            }
        },
        {
            "name": "Dice (D6)",
            "category": [
                "dice"
            ],
            "size": {
                "width": 58,
                "height": 58,
                "row": 10,
                "col": 6,
                "total": 60
            },
            "min": 1,
            "max": 6,
            "step": 0,
            "img": {
                "thumbnail": "table/dice/d6-thumbnail.avif"
            },
            "variant": [
                {
                    "name": "green",
                    "color": "hsl(143.8 61.2% 35%)",
                    "img": "table/dice/d6-green.avif"
                },
                {
                    "name": "red",
                    "color": "hsl(0 62.8% 45%)",
                    "img": "table/dice/d6-red.avif"
                },
                {
                    "name": "gray",
                    "color": "hsl(0 0% 45%)",
                    "img": "table/dice/d6-gray.avif"
                }
            ]
        }
    ]
}

export default { id: 'wow', game, deck, simulator }
