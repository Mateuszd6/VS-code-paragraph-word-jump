# Faster Paragraph/Word movement for VS Code
This is my simple extension which allows for quick code navigation. Since VS
code does not support paragraph movement I wanted to add those
("forward-paragraph" in Emacs or square brackets in Vim). However, I've found
that some editors jump much further than others (examples below). Hence,
paragraph jump is available in two options; "hungry" and normal. You can choose
whichever you like. For the same reason this package also provides function that
jump or delete next/previous word that move more aggresively than their default
counterpars provided in VS Code.

## Provided commands
```
faster-para-word-movement.paraDown
faster-para-word-movement.paraDownSelect
faster-para-word-movement.paraDownHungry
faster-para-word-movement.paraDownSelectHungry
faster-para-word-movement.paraUp
faster-para-word-movement.paraUpSelect
faster-para-word-movement.paraUpHungry
faster-para-word-movement.paraUpSelectHungry

faster-para-word-movement.wordRightHungry
faster-para-word-movement.wordRightSelectHungry
faster-para-word-movement.wordLeftHungry
faster-para-word-movement.wordLeftSelectHungry
faster-para-word-movement.wordLeftKillHungry
faster-para-word-movement.wordRightKillHungry
```

Functions for moving up/down a paragraph come with both options default and
hungry (the latter have a "Hungry" suffix). Each function (expect kill) have
it's select counterpar (usually, when you have wordLeft binded to <ctrl+left>
you will have wordRightSelect binded to <ctrl+shift+left>). Of course word
movement functions come only in "hungry" mode, because their non-hungry
counterparts are already provided by VS Code. You have to map the provided
function to your desired keybindings.

## Paragraph travel
```
-- normal: --
|
This is
a text island.
|


|
This is
a second text island.
|

-- hungry: --
|
This is
a text island.
|

                      <-- (won't stop here)
This is
a second text island.
|
```

## Word travel or deletion
```
normal: |this| is|->|text|
hungry: |this| is|->text|
                    ^
                    |
              a difference
```

## Acknowledgments
