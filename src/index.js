import emojisList from '../emoji-en-US.json' assert { type: "json" };
import {emojifyString, getMostSimilar}  from './s2v.js';

const rawTextarea = document.getElementById("raw-text-input");
const emojifiedTextarea = document.getElementById("emojified-text-input");
const submitButton = document.getElementById("submit-button");
const embeddingsCheckbox = document.getElementById("embeddings-checkbox");
const liveModeCheckbox = document.getElementById("live-mode-checkbox");
let prevRawInput = "";
let curRawInput = "";
let prevCursorPosition = 0;
let cursorPosition = 0;
const letterRegex = /[a-zA-Z]$/;

const handleEmojify = async () => {
    const rawText = rawTextarea.value;
    console.log("checked", embeddingsCheckbox.checked)
    const useEmbeddings = embeddingsCheckbox.checked;
    const emojifiedText = await emojifyString(rawText, useEmbeddings);
    emojifiedTextarea.value = emojifiedText;
}

const getDiff = (previous, current) => {
    let lengthDiff = current.length - previous.length;

    for (let i = 0; i <= current.length - lengthDiff; i++) {
        if (current.substring(0, i) + current.substring(i + lengthDiff) === previous) {
          return current.substring(i, i + lengthDiff);
        }
    }
    return "";
}

const getEmojifiedPosition = (raw, emojified, end) => {
    let i = 0, j = 0;
    while (i < end) {
        if (raw[i] === emojified[j]) {
            i++;
            j++;
        }
        // matching injected sequence of emojis and whitespace
        let jj = j;
        let curEmojiStr = ""
        while (jj < emojified.length && emojified[jj] !== " ") {
            curEmojiStr += emojified[jj];
            jj++;
        }
        // accoount for trailing whitespace
        if (curEmojiStr in emojisList) {
            jj++;
            j = jj;
        }
    }
    return j;
}

submitButton.addEventListener("click", handleEmojify);

rawTextarea.addEventListener('click',() => {
    cursorPosition = rawTextarea.selectionStart;
})

rawTextarea.addEventListener('keyup',() => {
    cursorPosition = rawTextarea.selectionStart;
})

async function handleInsertion() {
    const useEmbeddings = embeddingsCheckbox.checked;
    let insertionString = getDiff(prevRawInput, curRawInput);
    // need to use prev raw input to account for the fact that the latest insertion does not exist in the emojified textarea
    const insertionPosition = getEmojifiedPosition(prevRawInput, emojifiedTextarea.value, prevCursorPosition);
    // big chunk was copy-pasted
    if (curRawInput.length > prevRawInput.length + 1) {
        // prepend partial word before difference string
        let i = insertionPosition
        for (; i >= 1 && emojifiedTextarea.value[i - 1].match(letterRegex); i--) {
            insertionString = emojifiedTextarea.value[i-1] + insertionString;
        }
        // append partial word after difference string
        let j = insertionPosition
        for (; j < emojifiedTextarea.value.length && emojifiedTextarea.value[j].match(letterRegex); j++) {
            insertionString += emojifiedTextarea.value[j];
        }
        insertionString = await emojifyString(insertionString, useEmbeddings);
        emojifiedTextarea.value = emojifiedTextarea.value.slice(0, i) + insertionString + emojifiedTextarea.value.slice(j);
    } else {
        const lastCharacter = curRawInput[cursorPosition-1];
        const secondToLastCharacter = curRawInput[cursorPosition-2];
        const isLCLetter = letterRegex.test(lastCharacter);
        const isSLCLetter = letterRegex.test(secondToLastCharacter);
        let promptString = "";
        if (!isLCLetter && isSLCLetter) {
            for (let i = cursorPosition-2; i >= 0 && curRawInput[i].match(letterRegex); i--) {
                promptString = curRawInput[i] + promptString;
            }
            const mostSimilar = await getMostSimilar(promptString, useEmbeddings)
            insertionString += mostSimilar ? mostSimilar + " " : "";
        }
        emojifiedTextarea.value = emojifiedTextarea.value.slice(0, insertionPosition) + insertionString + emojifiedTextarea.value.slice(insertionPosition);
    }
}

async function handleDeletion() {
    let deletionString = getDiff(curRawInput, prevRawInput);
    // deletionStart is location of first char to be deleted
    let deletionStart = getEmojifiedPosition(prevRawInput, emojifiedTextarea.value, cursorPosition);
    // deletionEnd is location of first char to not be deleted after deletionStart
    const deletionEnd = getEmojifiedPosition(prevRawInput, emojifiedTextarea.value, cursorPosition+deletionString.length);
    // account for trailing emojis
    let nextSpace = deletionEnd;
    while (nextSpace < emojifiedTextarea.value.length && emojifiedTextarea.value[nextSpace] !== " ") {
        nextSpace++;
    }

    // when deleting a space, need to delete corresponding emoji string in emojifiedTextarea
    if (nextSpace === deletionEnd) {
        // start emojiStrStart at position trailing of space and check position before it
        let curEmojiStr = ""
        while (deletionStart >= 0 && emojifiedTextarea.value[deletionStart] !== " ") {
            curEmojiStr = emojifiedTextarea.value[deletionStart] + curEmojiStr;
            deletionStart--;
        }
    }
    let emojiStrEnd = nextSpace+1;
    let curEmojiStr = ""
    while (emojiStrEnd < emojifiedTextarea.value.length && emojifiedTextarea.value[emojiStrEnd] !== " ") {
        curEmojiStr += emojifiedTextarea.value[emojiStrEnd];
        emojiStrEnd++;
    }

    if (curEmojiStr in emojisList) {
        // deleting deletion string, leaving an incomplete word and emoji string following newly created incomplete word
        emojifiedTextarea.value = emojifiedTextarea.value.slice(0, deletionStart) + emojifiedTextarea.value.slice(deletionEnd, nextSpace) + emojifiedTextarea.value.slice(emojiStrEnd)
    } else {
        // just deleting deletion string since no incomplete word was created
        emojifiedTextarea.value = emojifiedTextarea.value.slice(0, deletionStart) + emojifiedTextarea.value.slice(deletionEnd);
    }
}

rawTextarea.addEventListener('input', async function(e) {
    e.preventDefault();
    prevRawInput = curRawInput;
    curRawInput = rawTextarea.value;
    prevCursorPosition = cursorPosition;
    cursorPosition = rawTextarea.selectionStart;
    const useLiveMode = liveModeCheckbox.checked;
    if (useLiveMode) {
        if (curRawInput.length > prevRawInput.length) {
            await handleInsertion();
        } else {
            await handleDeletion();
        }
    }
});