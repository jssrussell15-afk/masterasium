# Content guide: catch-up, then the idea, then the numbers

Catch-up items follow concrete, then picture, then numbers. A child who is still building a skill starts with a virtual manipulative. The same skill later uses a picture of that tool, then the numbers alone.

This is the concrete-representational-abstract path. The manipulative comes before the procedure.

## Fields on a content item

- `manipulative`: `none`, `base_ten`, `number_line`, or `fraction_bars`
- `cra_stage`: `concrete`, `representational`, or `abstract`
- `segment_variant`: `catch_up`, `standard`, or `go_further`

Concrete items name a manipulative. Abstract items use `none`. Catch-up moves along the three stages as first-try accuracy rises. A change waits for two sets on the new side of the line, so the stage does not flip after one lucky question.

## Tools

- Base-ten blocks: tap or the keyboard to group 10 ones into a ten, or to ungroup a ten.
- Number line: tap a mark, or press Arrow Right and Arrow Left. The jump size can be 1, 5, or 10.
- Fraction bars: tap a part to shade it, or split the bar into 2 or 4 equal parts.

Each control is a button at least 44px on a side, with a screen-reader name. Speak uses the device voice (`speechSynthesis`, English, Canada) for the question and the current step, the same control as the practice read-aloud. The same sentence is also announced in an aria-live region. There is no animation and no reward sound.

Manipulative actions are stored as a compact trace (`j` for jumps, `b` for group and ungroup). That trace is the input the strategy tagger reads. The tagger lives on a sibling branch until the two are combined.

## Re-teach examples

A re-teach worked example is always guided: one step at a time, then the child types the answer. It is the prerequisite skill, not an easier item of the skill they were stuck on.
