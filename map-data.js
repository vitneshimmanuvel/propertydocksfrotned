/* -------------------------------------------------------------
 * Real Estate Interactive Map Database
 * Contains plot coordinates, attributes, and road definitions.
 * All coordinates are defined on a 1600x1000 SVG coordinate grid.
 * ------------------------------------------------------------- */

const INITIAL_MAP_DATA = {
    canvas: {
        width: 1600,
        height: 1000,
        viewBox: "0 0 1600 1000"
    },
    
    // Optional sketch image overlay for precise visual mapping
    backgroundImage: {
        href: null,
        opacity: 0.35,
        x: -40,
        y: -100,
        width: 1620,
        height: 1100
    },
    
    // Road geometries and labels
    roads: [
        {
            id: "road-main-right",
            name: "12.00 MT WIDE ROAD",
            points: [[1290, 0], [1400, 0], [1520, 1000], [1410, 1000]],
            textPath: "M 1345,0 L 1465,1000",
            style: { fill: "rgba(255, 255, 255, 0.05)", stroke: "rgba(255, 255, 255, 0.15)" }
        },
        {
            id: "road-bottom",
            name: "9.00 MT WIDE ACCESS ROAD",
            points: [[850, 830], [1600, 690], [1600, 770], [870, 900]],
            textPath: "M 860,865 L 1600,730",
            style: { fill: "rgba(255, 255, 255, 0.05)", stroke: "rgba(255, 255, 255, 0.12)" }
        },
        {
            id: "road-internal-divide",
            name: "INTERNAL SUB-ROAD",
            points: [
                [80, 675], [100, 665], [300, 615], [450, 565], [600, 525], [780, 480], [900, 450],
                [900, 470], [780, 500], [600, 545], [450, 585], [300, 635], [100, 685], [80, 695]
            ],
            style: { fill: "rgba(255, 255, 255, 0.04)", stroke: "rgba(255, 255, 255, 0.1)" }
        }
    ],

    // Plot layouts (Polygons with nodes and metadata)
    plots: [
        // ---- RIGHT SIDE: MAIN PREMIUM SUBPLOTS ----
        {
            id: "SUB. PLOT NO-1",
            status: "premium",
            area: 2052.00,
            price: 450, // Per sq. mt.
            owner: "Vanguard Builders Group",
            notes: "Premium commercial & residential zone with large footprint, adjoining 12.00m Wide Road.",
            points: [[930, 270], [1280, 210], [1325, 500], [1160, 530], [1190, 750], [950, 790]],
            labelOffset: { x: -30, y: -20 },
            isBuilding: true // Marks hatched house boundary in center
        },
        {
            id: "COMMON PLOT",
            status: "available",
            area: 315.00,
            price: 180,
            owner: "Community Association",
            notes: "Designated community green park and common open space layout.",
            points: [[1160, 530], [1325, 500], [1350, 720], [1190, 750]],
            labelOffset: { x: 0, y: 0 },
            isCommon: true
        },

        // ---- BOTTOM LEFT ORGANIC CORNER ----
        {
            id: "216+218+217+220",
            status: "sold",
            area: 3450.00,
            price: 210,
            owner: "Acme Industrial Ventures",
            notes: "Massive combined estate layout at the bottom-left boundary. Future subdivision possible.",
            points: [[120, 685], [260, 785], [320, 835], [460, 955], [320, 975], [150, 955], [90, 875]],
            labelOffset: { x: 0, y: 30 }
        },
        {
            id: "210",
            status: "available",
            area: 1200.00,
            price: 250,
            owner: null,
            notes: "Large vertical plot in bottom-center segment. Excellent drainage, dual-sided road access.",
            points: [[460, 765], [600, 705], [550, 945], [460, 955]],
            labelOffset: { x: -10, y: -20 }
        },

        // ---- MIDDLE SEGMENT BELOW INTERNAL DIVIDER ----
        {
            id: "222",
            status: "sold",
            area: 180.00,
            price: 280,
            owner: "Elena Rostova",
            notes: "Compact parcel on far-left border adjacent to divider road entrance.",
            points: [[50, 580], [110, 560], [130, 650], [70, 670]],
            labelOffset: { x: 0, y: 0 }
        },
        {
            id: "226",
            status: "reserved",
            area: 210.00,
            price: 310,
            owner: "Marcus Vance",
            notes: "Elevated flat lot, excellent corner views, direct street connectivity.",
            points: [[100, 480], [190, 460], [210, 550], [120, 570]],
            labelOffset: { x: 0, y: 0 }
        },
        {
            id: "219",
            status: "available",
            area: 420.00,
            price: 290,
            owner: null,
            notes: "Mid-sized parcel offering convenient access to local arterial lanes.",
            points: [[110, 560], [300, 510], [320, 600], [130, 650]],
            labelOffset: { x: 0, y: 0 }
        },
        {
            id: "212",
            status: "sold",
            area: 480.00,
            price: 320,
            owner: "David & Sarah Lin",
            notes: "Central lot with established utilities and broad frontages.",
            points: [[300, 510], [450, 470], [470, 560], [320, 600]],
            labelOffset: { x: 0, y: 0 }
        },
        {
            id: "212/B", // Representing the second 212 plot adjacent
            status: "available",
            area: 460.00,
            price: 315,
            owner: null,
            notes: "Secondary central layout parcel matching high utility parameters.",
            points: [[450, 470], [580, 440], [600, 530], [470, 560]],
            labelOffset: { x: 0, y: 0 }
        },
        {
            id: "204/P",
            status: "available",
            area: 280.00,
            price: 330,
            owner: null,
            notes: "Convenient narrow strip plot perfect for customized urban homes.",
            points: [[580, 440], [640, 420], [650, 510], [600, 530]],
            labelOffset: { x: 0, y: 0 }
        },
        {
            id: "204/P2",
            status: "reserved",
            area: 260.00,
            price: 330,
            owner: "Sophia Chen",
            notes: "Adjoining parcel mirroring high investment yield parameters.",
            points: [[640, 420], [700, 400], [710, 490], [650, 510]],
            labelOffset: { x: 0, y: 0 }
        },
        {
            id: "205/P",
            status: "available",
            area: 390.00,
            price: 300,
            owner: null,
            notes: "Well-proportioned lot bordering eastern green reserve contours.",
            points: [[700, 400], [800, 370], [820, 460], [710, 490]],
            labelOffset: { x: 0, y: 0 }
        },
        {
            id: "206/P",
            status: "sold",
            area: 340.00,
            price: 295,
            owner: "John Doe",
            notes: "Quiet street layout featuring mature perimeter trees.",
            points: [[710, 490], [820, 460], [800, 550], [690, 580]],
            labelOffset: { x: 0, y: 0 }
        },

        // ---- LOWER NEIGHBORHOOD BELOW ROAD ----
        {
            id: "215",
            status: "available",
            area: 620.00,
            price: 270,
            owner: null,
            notes: "Deep rear setback capabilities, ideal for multi-story residential designs.",
            points: [[180, 650], [320, 610], [300, 760], [240, 780]],
            labelOffset: { x: 0, y: 0 }
        },
        {
            id: "213",
            status: "sold",
            area: 580.00,
            price: 285,
            owner: "Albert Higgins",
            notes: "Stately family lot directly connected to central neighborhood utility lines.",
            points: [[320, 610], [440, 570], [420, 720], [300, 760]],
            labelOffset: { x: 0, y: 0 }
        },
        {
            id: "211/P1",
            status: "available",
            area: 210.00,
            price: 340,
            owner: null,
            notes: "Premium utility row layout with sleek road footprint.",
            points: [[440, 570], [490, 560], [470, 710], [420, 720]],
            labelOffset: { x: 0, y: 0 }
        },
        {
            id: "211/P2",
            status: "available",
            area: 210.00,
            price: 340,
            owner: null,
            notes: "Secondary vertical row unit matching exact layout specifications.",
            points: [[490, 560], [540, 550], [520, 700], [470, 710]],
            labelOffset: { x: 0, y: 0 }
        },
        {
            id: "211/P3",
            status: "available",
            area: 240.00,
            price: 340,
            owner: null,
            notes: "Slightly broader corner unit finishing the high-demand 211 subdivision.",
            points: [[540, 550], [600, 540], [580, 690], [520, 700]],
            labelOffset: { x: 0, y: 0 }
        },
        {
            id: "214/P",
            status: "sold",
            area: 720.00,
            price: 290,
            owner: "Gregory Peck",
            notes: "Broad plot offering unique structural alignment parameters.",
            points: [[240, 780], [420, 720], [440, 770], [300, 840], [240, 820]],
            labelOffset: { x: 0, y: 0 }
        },

        // ---- UPPER SEGMENTS: ARCHED UPPER HILL TIERS ----
        // Row 1 (Immediately above internal lane)
        {
            id: "231/A",
            status: "available",
            area: 510.00,
            price: 320,
            owner: null,
            notes: "Elevated flat lot overlooking the central road artery.",
            points: [[100, 500], [280, 450], [280, 370], [100, 420]],
            labelOffset: { x: 0, y: 0 }
        },
        {
            id: "231/B",
            status: "sold",
            area: 490.00,
            price: 330,
            owner: "Carlos Santana",
            notes: "Excellent central placement, highly desirable flat grading features.",
            points: [[280, 450], [450, 400], [450, 320], [280, 370]],
            labelOffset: { x: 0, y: 0 }
        },
        {
            id: "238/A",
            status: "available",
            area: 440.00,
            price: 350,
            owner: null,
            notes: "Quiet middle tier plot with private landscaping options.",
            points: [[450, 400], [600, 360], [600, 280], [450, 320]],
            labelOffset: { x: 0, y: 0 }
        },
        {
            id: "237/A",
            status: "premium",
            area: 540.00,
            price: 410,
            owner: "Royal Crest Homes",
            notes: "Magnificent view vectors. Designated for luxury modern estate.",
            points: [[600, 360], [780, 310], [780, 230], [600, 280]],
            labelOffset: { x: 0, y: 0 }
        },

        // Row 2 (Middle Tier)
        {
            id: "232/P1",
            status: "available",
            area: 320.00,
            price: 360,
            owner: null,
            notes: "Upper tier plot featuring quiet privacy buffers.",
            points: [[240, 330], [360, 300], [360, 210], [240, 240]],
            labelOffset: { x: 0, y: 0 }
        },
        {
            id: "232/P2",
            status: "available",
            area: 310.00,
            price: 360,
            owner: null,
            notes: "Central view lot offering panoramic northern horizons.",
            points: [[360, 300], [480, 270], [480, 180], [360, 210]],
            labelOffset: { x: 0, y: 0 }
        },
        {
            id: "235/P",
            status: "sold",
            area: 280.00,
            price: 375,
            owner: "Yuki Tanaka",
            notes: "High elevation parcel matching premium layout standardizations.",
            points: [[480, 270], [560, 250], [540, 160], [480, 180]],
            labelOffset: { x: 0, y: 0 }
        },
        {
            id: "236/P",
            status: "available",
            area: 290.00,
            price: 370,
            owner: null,
            notes: "Splendid mountain view contours, highly rated for architectural uniqueness.",
            points: [[560, 250], [640, 230], [620, 140], [540, 160]],
            labelOffset: { x: 0, y: 0 }
        },

        // Row 3 (Upper Hill Top)
        {
            id: "233/P",
            status: "reserved",
            area: 360.00,
            price: 390,
            owner: "Winston Smith",
            notes: "Excellent crest placement with cooling cross breeze options.",
            points: [[260, 210], [380, 180], [360, 110], [240, 140]],
            labelOffset: { x: 0, y: 0 }
        },
        {
            id: "234/P",
            status: "premium",
            area: 340.00,
            price: 425,
            owner: "Diana Prince",
            notes: "Superb dual access plot perched on high hill crest parameters.",
            points: [[380, 180], [480, 150], [460, 70], [360, 110]],
            labelOffset: { x: 0, y: 0 }
        },
        {
            id: "238/P",
            status: "available",
            area: 380.00,
            price: 380,
            owner: null,
            notes: "Highly private forest bordering lot with gentle landscape grading.",
            points: [[480, 150], [580, 120], [560, 30], [460, 70]],
            labelOffset: { x: 0, y: 0 }
        },

        // Top Row (Peak Bordering Plots)
        {
            id: "317/P1",
            status: "sold",
            area: 190.00,
            price: 400,
            owner: "Amelia Earhart",
            notes: "Topmost perimeter subdivision lot with spectacular horizon vectors.",
            points: [[180, 130], [240, 110], [220, 50], [160, 70]],
            labelOffset: { x: 0, y: 0 }
        },
        {
            id: "317/P2",
            status: "available",
            area: 180.00,
            price: 400,
            owner: null,
            notes: "Elevated crest lot with minimal slope grading requirements.",
            points: [[240, 110], [300, 90], [280, 30], [220, 50]],
            labelOffset: { x: 0, y: 0 }
        },
        {
            id: "310/P1",
            status: "available",
            area: 250.00,
            price: 410,
            owner: null,
            notes: "Adjoining standard parcel on north hill boundary layout.",
            points: [[300, 90], [380, 70], [360, 0], [280, 30]],
            labelOffset: { x: 0, y: 0 }
        },
        {
            id: "310/P2",
            status: "available",
            area: 230.00,
            price: 410,
            owner: null,
            notes: "Tranquil northern parcel bordering nature conservancy lines.",
            points: [[380, 70], [450, 50], [430, 0], [360, 0]],
            labelOffset: { x: 0, y: 0 }
        },
        {
            id: "309",
            status: "sold",
            area: 260.00,
            price: 430,
            owner: "Jean-Luc Picard",
            notes: "Peak level estate parcel, sweeping panoramic vistas of entire valley.",
            points: [[450, 50], [520, 30], [500, 0], [430, 0]],
            labelOffset: { x: 0, y: 0 }
        },
        {
            id: "208",
            status: "premium",
            area: 520.00,
            price: 460,
            owner: "Bruce Wayne",
            notes: "Highest elevation layout plot. Massive footprint, complete boundary seclusion.",
            points: [[520, 30], [680, 0], [660, 0], [500, 0]],
            labelOffset: { x: 0, y: 0 }
        }
    ],

    // Hatch boundary inside Sub plot 1
    hatches: [
        {
            id: "sub-plot-1-building",
            points: [[1020, 350], [1160, 320], [1180, 420], [1120, 430], [1130, 480], [1030, 490]],
            style: { fill: "url(#diagonal-hatch)", stroke: "#000000", "stroke-width": 2 }
        }
    ]
};

// Export to window object for pure global standard accessibility in modular browser SPA
window.INITIAL_MAP_DATA = INITIAL_MAP_DATA;
