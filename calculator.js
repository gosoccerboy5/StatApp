//aside from calculating arithmetic and whatnot,
//this can also use any builtin constants or functions on the Math object or anything that you add to Math

function evaluate(string) {
  if (/^ *$/.test(string)) return null;
  let strings = [...string.matchAll(/\b[a-zA-Z]+\b/g)].map(arr => arr[0]);
  let allowedFunctions = Object.getOwnPropertyNames(Math);
  if (strings.every(string => allowedFunctions.concat(["sin", "cos", "tan", "abs", "sqrt", "log", "ln", "e", "pi"]).includes(string))) {
    if (/([^\[\]0-9,.\+\-\/\*\^\(\)\n ])/.test(string.replaceAll(/[a-zA-Z]/g, ""))) return null;
    string = string.replaceAll(/\b([a-zA-Z]+)\b/g, "Math.$1");
    let transforms = [["^", "**"], ["log", "log10"], ["ln", "log"], ["Math.e", "Math.E"], ["Math.pi", "Math.PI"]];
    for (let transform of transforms) {
      string = string.replaceAll(transform[0], transform[1]);
    }
    try {
      return eval(string);
    } catch {
      return null;
    }
  } else return null;
}
function addStyle() {
  let style = document.createElement("style");
  style.innerText = `
  .calculator {
    font-family: monospace;
    border-radius: 10px;
    border: 1px solid black;
    position: fixed;
    right: 1%;
    height: 30%;
    width: 20%;
    background: darkgrey;
  }
  .calculator:hover {
    cursor: grab;
  }
  .calculator:active {
    cursor: grabbing;
  }
  .calculator *:hover {
    cursor: initial;
  }
  .previousWindow {
    height: calc(100% - 15px - 20px - 20px - 10px);
    margin: 10px;
    border-radius: 5px;
    background: lightgrey;
    padding: 5px;
    overflow-y: scroll;
  }
  .previousWindow::-webkit-scrollbar {
    width: 8px;
    background: rgba(0, 0, 0, 0);
  }
  .previousWindow::-webkit-scrollbar-thumb {
    -webkit-appearance: none !important;
    -moz-appearance: none !important;
    appearance: none !important;
    background-color: rgba(33,36,44,0.32) !important;
    height: 20px !important;
    border-radius: 10px !important;
  }
  .calculatorInput {
    position: absolute;
    bottom: 0%;
    left: 0%;
    margin: 10px;
    background: lightgrey;
    width: calc(100% - 42px - 10px - 10px - 10px - 10px);
  }
  .calculatorEnter {
    width: 42px;
    position: absolute;
    bottom: 0%;
    margin: 10px;
    right: 0%;
    background: grey;
    cursor: default;
  }
  .calculatorEnter:hover{
    background: grey!important;
  }
  .calculatorEnter:active, .removeCalculator:active, .removeCalculator:hover {
    background: dimgrey!important;
  }
  .previousEntry {
    position: static;
    float: left;
  }
  .previousAnswer {
    float: right;
  }
  .removeCalculator {
    font-family: Helvetica;
    border-radius: 100px;
    height: 20px;
    width: 20px;
    position: absolute;
    top: 0%;
    right: 0%;
    padding: 2px;
    background: grey;
    font-size: 100%;
    margin: -7px;
    cursor: pointer;
  }
  .calculator .removeCalculator:hover, .calculator .removeCalculator b:hover {
    cursor: pointer!important;
  }`;
  document.head.appendChild(style);
}

function calculatorElement() {
  if (document.querySelector(".calculator") !== null) return;
  let div = document.createElement("div");
  div.innerHTML = `<div class="previousWindow"></div><input class="calculatorInput"></input>
  <button class="calculatorEnter">Enter</button><button class="removeCalculator"><b>&times;</b></button>`;
  div.className = "calculator";
  let input = div.querySelector(".calculatorInput"),
    enter = div.querySelector(".calculatorEnter"), previous = div.querySelector(".previousWindow");
  input.addEventListener("input", function() {
    this.style.backgroundColor = "";
  });
  function calculate() {
    let inputValue = input.value;
    let answer = evaluate(inputValue);
    if (answer === null) {
      input.style.backgroundColor = "pink";
      return;
    } else {
      function truncList(list) {
        return list.map(item => item instanceof Array ? truncList(item) : Math.round(item*1e7)/1e7).join(", ");
      }
      if (answer instanceof Array) {
        answer = truncList(answer);
      } else answer = Math.round(answer*1e7)/1e7;
    }
    let span1 = document.createElement("span");
    span1.className = "previousEntry";
    span1.innerText = inputValue;
    let span2 = document.createElement("span");
    span2.className = "previousAnswer";
    span2.innerText = answer;
    input.value = answer;
    previous.appendChild(span1);
    previous.appendChild(document.createElement("br"));
    previous.appendChild(span2);
    previous.appendChild(document.createElement("br"));
    previous.scrollTo({top: previous.scrollHeight});
  }
  enter.addEventListener("click", calculate);
  input.addEventListener("keydown", function(e) {
    if (e.key === "Enter") calculate();
  });

  if (document.body.children.length > 0) {
    document.body.insertBefore(div, document.body.children[0]);
  } else {
    document.body.append(div);
  }

  let offset = [0, 0];
  let grabbing = false;
  window.addEventListener("mousedown", function(e) {
    if (e.target === div) {
      grabbing = true;
      document.body.style.userSelect = "none";
      offset[0] = e.clientX - Number(getComputedStyle(div).left.replace("px", ""));
      offset[1] = e.clientY -  Number(getComputedStyle(div).top.replace("px", ""));
    }
  });
  window.addEventListener("mousemove", function(e) {
    function clamp(x, min, max) {
      return Math.min(Math.max(x, min), max);
    }
    if (grabbing) {
      div.style.left = String(clamp(e.clientX - offset[0], 0, window.innerWidth-Number(getComputedStyle(div).width.replace("px", "")))) + "px";
      div.style.top = String(clamp(e.clientY - offset[1], 0, window.innerHeight-Number(getComputedStyle(div).height.replace("px", "")))) + "px";
    }
  });
  window.addEventListener("mouseup", function() {
    grabbing = false;
    document.body.style.userSelect = "";
  });

  div.querySelector(".removeCalculator").addEventListener("click", function() {
    document.body.removeChild(div);
  });
  input.focus();
}

addStyle();
