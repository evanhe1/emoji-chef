
import {emojifyString, getMostSimilar}  from './s2v.js';

const loadingOverlays = document.querySelectorAll(".loading-overlay");

const resEmojis = await fetch('./emoji-en-US.json');
const emojisList = await resEmojis.json();
const rawTextarea = document.getElementById("raw-text-input");
const emojifiedTextarea = document.getElementById("emojified-text-input");
const submitButton = document.getElementById("submit-button");
const embeddingsCheckbox = document.getElementById("embeddings-checkbox");
const liveModeCheckbox = document.getElementById("live-mode-checkbox");
const textContainer = document.getElementById("text-container")
let prevRawInput = "";
let curRawInput = "";
let emojifiedInput = "";
let prevCursorPosition = 0;
let cursorPosition = 0;
const letterRegex = /[a-zA-Z]$/;

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

submitButton.addEventListener("click", async () => {
    const rawText = rawTextarea.value;
    console.log("checked", embeddingsCheckbox.checked)
    const useEmbeddings = embeddingsCheckbox.checked;
    emojifiedInput = await emojifyString(rawText, useEmbeddings);
    emojifiedTextarea.value = emojifiedInput;
});

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
    const insertionPosition = getEmojifiedPosition(prevRawInput, emojifiedInput, prevCursorPosition);
    // big chunk was copy-pasted
    if (curRawInput.length > prevRawInput.length + 1) {
        // prepend partial word before difference string
        let i = insertionPosition
        for (; i >= 1 && emojifiedInput[i - 1].match(letterRegex); i--) {
            insertionString = emojifiedInput[i-1] + insertionString;
        }
        // append partial word after difference string
        let j = insertionPosition
        for (; j < emojifiedInput.length && emojifiedInput[j].match(letterRegex); j++) {
            insertionString += emojifiedInput[j];
        }
        insertionString = await emojifyString(insertionString, useEmbeddings);
        emojifiedInput = emojifiedInput.slice(0, i) + insertionString + emojifiedInput.slice(j);
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
        emojifiedInput = emojifiedInput.slice(0, insertionPosition) + insertionString + emojifiedInput.slice(insertionPosition);
    }
}

async function handleDeletion() {
    let deletionString = getDiff(curRawInput, prevRawInput);
    // deletionStart is location of first char to be deleted
    let deletionStart = getEmojifiedPosition(prevRawInput, emojifiedInput, cursorPosition);
    // deletionEnd is location of first char to not be deleted after deletionStart
    const deletionEnd = getEmojifiedPosition(prevRawInput, emojifiedInput, cursorPosition+deletionString.length);
    // account for trailing emojis
    let nextSpace = deletionEnd;
    while (nextSpace < emojifiedInput.length && emojifiedInput[nextSpace] !== " ") {
        nextSpace++;
    }

    // when deleting a space, need to delete corresponding emoji string in emojifiedTextarea
    if (nextSpace === deletionEnd) {
        // start emojiStrStart at position trailing of space and check position before it
        let curEmojiStr = ""
        while (deletionStart >= 0 && emojifiedInput[deletionStart] !== " ") {
            curEmojiStr = emojifiedInput[deletionStart] + curEmojiStr;
            deletionStart--;
        }
    }
    let emojiStrEnd = nextSpace+1;
    let curEmojiStr = ""
    while (emojiStrEnd < emojifiedInput.length && emojifiedInput[emojiStrEnd] !== " ") {
        curEmojiStr += emojifiedInput[emojiStrEnd];
        emojiStrEnd++;
    }

    if (curEmojiStr in emojisList) {
        // deleting deletion string, leaving an incomplete word and emoji string following newly created incomplete word
        emojifiedInput = emojifiedInput.slice(0, deletionStart) + emojifiedInput.slice(deletionEnd, nextSpace) + emojifiedInput.value.slice(emojiStrEnd)
    } else {
        // just deleting deletion string since no incomplete word was created
        emojifiedInput = emojifiedInput.slice(0, deletionStart) + emojifiedInput.slice(deletionEnd);
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
        emojifiedTextarea.value = emojifiedInput;
    }
});

liveModeCheckbox.addEventListener('click', async () => {
    const useLiveMode = liveModeCheckbox.checked;
     const useEmbeddings = embeddingsCheckbox.checked;
    emojifiedTextarea.value = useLiveMode ? emojifiedInput : "";
    submitButton.classList.toggle("hidden-button");
    if (useLiveMode && rawTextarea.value !== "" && emojifiedInput === "") {
        for (const overlay of loadingOverlays) {
            overlay.style.visibility = "visible";
        }
        emojifiedTextarea.value = emojifiedInput = await emojifyString(rawTextarea.value, useEmbeddings);
        for (const overlay of loadingOverlays) {
            overlay.style.visibility = "hidden";
        }
    }
})