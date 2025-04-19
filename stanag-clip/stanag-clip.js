"use strict"
const jscad = require('@jscad/modeling')
const {intersect, subtract, union} = jscad.booleans
const {colorize} = jscad.colors
const {cube, sphere, polygon, circle, arc, rectangle} = jscad.primitives
const {extrudeLinear} = jscad.extrusions
const {expand} = jscad.expansions
const {mirrorY, align, translate} = jscad.transforms

const {degToRad} = jscad.utils

const getParameterDefinitions = () => {
    return [
        {
            name: 'countHighParts',
            type: 'number',
            initial: 3.0,
            min: 1.0,
            max: 500.0,
            step: 1,
            caption: 'Number of high parts in rail:'
        },
        {name: 'endsWithLow', type: 'checkbox', checked: false, caption: 'Rail ends on low part:'},
        {
            name: 'ringDiameter',
            type: 'number',
            initial: 19.8,
            min: 15.6,
            max: 100,
            step: 0.1,
            caption: 'Diameter of Ring [mm]:'
        },
        {
            name: 'ringStrength',
            type: 'number',
            initial: 2.5,
            min: 1,
            max: 10,
            step: 0.1,
            caption: 'Strength of ring [mm]:'
        },
        {
            name: 'ringHoleAngle',
            type: 'number',
            initial: 110,
            min: 0,
            max: 270,
            step: 1,
            caption: 'Angle of cutaway in ring [deg]:'
        },
    ]
}

function main(params) {
    const countHighParts = params.countHighParts;
    const endsWithLow = params.endsWithLow;

    const circleWidth = params.ringStrength;
    const circleRadius = params.ringDiameter / 2;
    const mountCircleInner = circle({radius: circleRadius, segments: 128});
    const cinner = align({modes: ['center', 'max']}, mountCircleInner);
    const couter = expand({delta: circleWidth}, cinner);


    const topDiff = 4.17 - 2.74;
    const bottomDiff = (19 - 15.62) / 2;
    const mid = 2.74 / 2;

    // we extend the base part of the rail to the mid point of the circle(ring) and then subtract the ring from it.
    // this ensures rail and ring are completely connected, independently of selected parameters
    const extraBottom = circleRadius + circleWidth;

    // this is a polygon of the complete rail outline, just the outer tips and not flat yet, but pointy as the extension of the 45 degree angles
    const railOutlineBase = polygon({points: [[-19 / 2 + topDiff, 2.74 + topDiff], [-19 / 2 - mid, mid], [-19 / 2 + bottomDiff, 0 - bottomDiff], [-19 / 2 + bottomDiff, 0 - 9.4 + 4.17 - extraBottom], [19 / 2 - bottomDiff, 0 - 9.4 + 4.17 - extraBottom], [19 / 2 - bottomDiff, 0 - bottomDiff], [19 / 2 + mid, mid], [19 / 2 - topDiff, 2.74 + topDiff]]});

    // the borders are just used to cut the outer tips and make them flat
    const leftBorder = polygon({
        points: [[-21.2 / 2, 2.74],
            [-21.2 / 2 - 5, 2.74],
            [-21.2 - 5 / 2, 0],
            [-21.2 / 2, 0]]
    });
    const rightBorder = polygon({
        points: [[21.2 / 2, 2.74], [21.2 / 2, 0], [21.2 + 5 / 2, 0],
            [21.2 / 2 + 5, 2.74],]
    });

    const circleTranslation = [0, -circleWidth - (9.4 - 4.7 - bottomDiff), 0];

    const railOutline = subtract(railOutlineBase, leftBorder, rightBorder, translate(circleTranslation, couter));

    const cutawayArcAngle = params.ringHoleAngle;
    const cutawayOuterArc = arc({
        radius: circleRadius + circleWidth + 0.01,
        startAngle: degToRad(270 - cutawayArcAngle / 2),
        endAngle: degToRad(270 + cutawayArcAngle / 2),
        segments: 128
    });
    const ringCutawayPolygonBase = polygon({points: [...cutawayOuterArc.points, [0, 0]]});
    const ringCutaway2d = translate([0, -circleRadius + circleTranslation[1], 0], ringCutawayPolygonBase);

    const widthOfLowPart = 5.25;
    const widthOfHighPart = 10 - 5.25;
    const countLowParts = (countHighParts - (endsWithLow ? 0 : 1));
    const height = widthOfHighPart * countHighParts + countLowParts * widthOfLowPart;

    const ringCutaway3d = extrudeLinear({height}, ringCutaway2d);

    const cutBottom = 2.74 - (21.2 - 19) / 2;
    const cut = polygon({points: [[-21.2 / 2, cutBottom], [21.2 / 2, cutBottom], [21.2 / 2, 10], [-21.2 / 2, 10]]});
    const cut3dBase = extrudeLinear({height: widthOfLowPart}, cut);
    const cut3d = translate([0, 0, widthOfHighPart], cut3dBase);

    let railCutsForLowerParts = cut3d;
    for (let i = 1; i < countLowParts; ++i) {
        railCutsForLowerParts = union(railCutsForLowerParts, translate([0, 0, (i + 1) * widthOfHighPart + i * widthOfLowPart], cut3dBase));
    }

    const rail3d = subtract(extrudeLinear({height}, railOutline), railCutsForLowerParts);

    const wholeRing3d = translate(circleTranslation, subtract(extrudeLinear({height: height}, couter), extrudeLinear({height: height}, cinner)));
    const wholeRingWithWithCutaway3d = params.ringHoleAngle <= 0.001 ? wholeRing3d : subtract(wholeRing3d, ringCutaway3d);

    return [
        rail3d,
        wholeRingWithWithCutaway3d,
    ]
}

module.exports = {main, getParameterDefinitions}
