let $ = document.querySelector.bind(document);
function addEnterEvent(el, fn) {
  el.addEventListener("keypress", function(e) {if (e.key === "Enter") fn();});
}

$("#showcalculator").addEventListener("click", function() {
  $("#showcalculator").disabled = true;
  calculatorElement();
  $(".removeCalculator").addEventListener("click", function() {
    $("#showcalculator").disabled = false;
  });
});

function addDataRow() {
  let tr = document.createElement("tr");
  tr.innerHTML = "<td><input></td><td><input></td>";
  for (let input of [...tr.childNodes].map(n => n.children[0])) {
    addEnterEvent(input, update);
    input.lastValue = "";
    input.addEventListener("keydown", function(e) {
      let idxV = [...$("#data").children].indexOf(this.parentElement.parentElement),
        idxH = [...this.parentElement.parentElement.children].indexOf(this.parentElement);
      (e.code === "ArrowUp") && (idxV > 1) && $("#data").children[idxV-1].children[idxH].children[0].focus();
      (e.code === "ArrowDown") && ((idxV < $("#data").children.length-1) ?
        $("#data").children[idxV+1].children[idxH].children[0].focus() : addDataRow());
      (e.code === "ArrowLeft") && (idxH === 1) && this.selectionStart === 0 && this.parentElement.parentElement.children[0].children[0].focus();
      (e.code === "ArrowRight") && this.selectionStart === this.value.length && ((idxH === 0) ? this.parentElement.parentElement.children[1].children[0].focus() :
        ((idxV < $("#data").children.length-1) ? $("#data").children[idxV+1].children[0].children[0].focus() : addDataRow()));
    });
    input.addEventListener("input", function() {
      if (!/^-?(\d*\.)?\d*$/.test(this.value)) this.value = this.lastValue;
      else this.lastValue = this.value;
    });
  }
  $("#data").appendChild(tr);
  if ($("#data").parentElement.style.display === "none") {
    $("#data").parentElement.style.display = ""; $("#hideData").innerText = "Hide";
  }
  tr.children[0].children[0].focus();
}
function removeDataRow() {
  if ($("#data").children.length > 4) $("#data").removeChild($("#data").children[$("#data").children.length-1]);
}
addDataRow();
addDataRow();
addDataRow();
document.activeElement.blur();

$("#transformation").addEventListener("input", function(e) {
  if (e.data === " ") {
    this.value = this.value.replaceAll(/\W/g, "");
  }
});
addEnterEvent($("#transformation"), update);
function transform(number) {
  let transformation = $("#transformation").value || $("#transformation").placeholder;
  try {
    return evaluate(transformation.replace(/\by\b/g, number));
  } catch {return null;}
}

function getData() {
  let pairs = [];
  for (let i = 1; i < $("#data").children.length; i++) {
    let pair = [...$("#data").children[i].children].map(el => el.children[0].value);
    let y = transform(pair[1]);
    if (y !== null && pair.every(n => /^-?(\d*\.)?\d+$/.test(n))) {
      pairs.push([pair[0], y]);
    }
  }
  return pairs;
}

function saveData() {
  localStorage.setItem("confidence", $("#confidence").value);
  localStorage.setItem("x", [...$("#data").children].map(el => el.children[0].children[0].value));
  localStorage.setItem("y", [...$("#data").children].map(el => el.children[1].children[0].value));
  localStorage.setItem("transform", $("#transformation").value);
}
$("#save").addEventListener("click", saveData);
function populate() {
  if (localStorage.getItem("confidence") !== null) $("#confidence").value = localStorage.getItem("confidence");
  if (localStorage.getItem("x") !== null && localStorage.getItem("y") !== null) {
    for (let i = $("#data").children.length; i < localStorage.getItem("x").split(",").length; i++) {
      addDataRow();
    }
    [...$("#data").children].forEach(function(el, idx) {
      el.children[0].children[0].value = el.children[0].children[0].lastValue = localStorage.getItem("x").split(",")[idx];
      el.children[1].children[0].value = el.children[1].children[0].lastValue = localStorage.getItem("y").split(",")[idx];
    });
  }
  if (localStorage.getItem("transform") !== null) $("#transformation").value = localStorage.getItem("transform");
}
$("#load").addEventListener("click", populate);

[$("#xName"), $("#yName")].forEach(function(el) {
  el.lastValue = "";
  el.addEventListener("input", function(e) {
    if (!/^[a-zA-Z]*$/.test(this.value)) {
      this.value = this.lastValue;
    } else this.lastValue = this.value;
  });
});
$("#addRow").addEventListener("click", addDataRow);
$("#removeRow").addEventListener("click", removeDataRow);
$("#hideData").addEventListener("click", function() {
  if ($("#data").parentElement.style.display === "none") {
    $("#data").parentElement.style.display = ""; this.innerText = "Hide";
  } else {
    $("#data").parentElement.style.display = "none"; this.innerText = "Show";
  }
});

function update() {
  let pairs = getData();
  if (pairs.length >= 3) updatePage(regress(getData()));
}
$("#enter").addEventListener("click", update);
addEnterEvent($("#confidence"), update);

function trunc(value, power=5) {
  return value === null ? null : Math.round(value * 10**power) / 10**power;
}

let gammaCache = Object.create(null);
function gamma(x) { // only works on positive numbers where x is either integer or ends in .5
  if (gammaCache[x] !== undefined) return gammaCache[x];
  let init = x % 1 === 0.5 ? Math.sqrt(Math.PI) : 1;
  for (let i = -(x % 1 - 1); i < x; i++) {
    init *= i;
  }
  gammaCache[x] = init;
  return init;
}

let gammaPlusHalfCache = Object.create(null), lastT = [];
function gammaPlusHalf(n) {
  if (n===0.5) return 1/Math.sqrt(Math.PI);
  if (gammaPlusHalfCache[n] !== undefined) return gammaPlusHalfCache[n];
  let start = gamma(n%1+1.5)/gamma(n%1+1);
  for (let i = 0; i < n-n%1-1; i++) {
    start *= (n%1+1.5+i)/(n%1+1+i);
  }
  gammaPlusHalfCache[n] = start;
  return start;
}
function tPDF(n, df) {
  return gammaPlusHalf(df/2)/Math.sqrt(Math.PI*df)*(1+n**2/df)**(-(df+1)/2);
}
function invT(percentile, df, position) {
  let value = 0; i = 0, step = 0.000005;
  if (position === 0) percentile = 0.5+percentile/2;
  if (position === 1) percentile = 1-percentile;
  if (lastT[0] === percentile && lastT[1] === df) return lastT[2];
  let factor = percentile < 0.5 ? -1 : 1;
  while ((percentile<0.5)?(value+0.5>percentile):(value+0.5<percentile)) {
    value += (tPDF(i, df)+tPDF(i+step, df))/2 * step * factor;
    i += step * factor;
  }
  lastT = [percentile, df, i];
  return i;
}
Math.invT = function(percentile, df) {
  return percentile >= 1 ? Infinity : trunc(invT(percentile, df, -1));
}
function tCDF(start, end, df) {
  if (start > 15 || end < -15) return 0;
  function integrate(start, end) {
    let factor = start < end ? 1 : -1;
    let step = 0.00001, value = 0;
    for (let i = Math.min(start, end); i < Math.max(start, end)-step; i += step) {
      value += (tPDF(i, df)+tPDF(i+step, df))/2 * step;
    }
    return value * factor;
  }
  return integrate(start === null ? 0 : start, end === null ? 0 : end) +
    (start === null ? 0.5 : 0) + (end === null ? 0.5 : 0);
}
Math.tcdf = function(l, h, df) {
  return trunc(tCDF(l <= -99 ? null : l, h >= 99 ? null : h, df));
};
function mgf(list, moment, center=0) {
  return list.reduce((a, b) => a+(b-center)**moment, 0);
}

function regress(pairs) {
  let n = pairs.length;
  let x = pairs.map(n => n[0]), y = pairs.map(n => n[1]);
  let meanX = mgf(x, 1)/n, meanY = mgf(y, 1)/n;
  let ssX = mgf(x, 2, meanX), ssY = mgf(y, 2, meanY);
  let b = pairs.reduce((a, b) => a+(b[0]-meanX)*(b[1]-meanY), 0)/ssX;
  let sdX = Math.sqrt(mgf(x, 2, meanX)/(n-2)), sdY = Math.sqrt(mgf(y, 2, meanY)/(n-2));
  let a = meanY - b*meanX, r = b*sdX/sdY;
  function predict(x, percentile=null) {
    if (percentile === null) return a+b*x;
    let error = invT(percentile, n-2, 0) * sResid * Math.sqrt(1/n+(x-meanX)**2/ssX);
    let predictionError = invT(percentile, n-2, 0) * sResid * Math.sqrt(1/n+(x-meanX)**2/ssX+1);
    return [a+b*x, a+b*x-error, a+b*x+error, a+b*x-predictionError, a+b*x+predictionError];
  }

  let residuals = pairs.map(pair => pair[1]-predict(pair[0]));
  let sResid = Math.sqrt(mgf(residuals, 2)/(n-2));

  let seB = sResid/Math.sqrt(n-2)/sdX;
  let tStatistic = b/seB;

  function inversePredict(y, percentile=null) {
    if (percentile === null) return (y-a)/b;
    let error = invT(percentile, n-2, 0) * sInvResid * Math.sqrt(1/n+(y-meanY)**2/ssY);
    let predictionError = invT(percentile, n-2, 0) * sInvResid * Math.sqrt(1/n+(y-meanY)**2/ssY+1);
    return [(y-a)/b, (y-a)/b-error, (y-a)/b+error, (y-a)/b-predictionError, (y-a)/b+predictionError];
  }
  let invResiduals = pairs.map(pair => pair[0]-inversePredict(pair[1]));
  let sInvResid = Math.sqrt(mgf(invResiduals, 2)/(n-2));
  return {data: pairs, n, residuals, a, b, predict, sResid, r, tStatistic, inversePredict, meanX, meanY, sdX, sdY, ssX, ssY};
}

function line(ctx, x1, y1, x2, y2, fill="black") {
  ctx.strokeStyle = fill;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.closePath();
}
function circle(ctx, x, y, radius, fill="black") {
  ctx.fillStyle = fill;
  ctx.arc(x, y, radius, 0, Math.PI*2);
  ctx.fill();
  ctx.closePath();
}
function drawRotatedText(ctx, text, x, y, rotate) {
  ctx.translate(x, y);
  ctx.rotate(rotate);
  ctx.fillText(text, 0, 0);
  ctx.rotate(-rotate);
  ctx.translate(-x, -y);
}
function magnitude(n) {
  return Math.floor(Math.log10(n))+1;
}
function ceil(a, b) {
  return Math.ceil(a/b)*b;
}

function convert(str) {
  return str.replaceAll(/([a-z])([A-Z])/g, (n,a,b)=>a+" "+b.toUpperCase()).replace(/^([a-z])([a-z])/, (n,a,b)=>a.toUpperCase()+b);
}

function updatePage(output) {
  $("#output").style.display = "";
  let transformation = $("#transformation").value || $("#transformation").placeholder;
  let xName = $("#xName").value || "x", yName = $("#yName").value || "y";
  let transY = transformation.replace(/\by\b/g, yName), transConvertedY = transformation.replace(/\by\b/g, convert(yName));
  let confidence = Math.min((Number($("#confidence").value) || 95), 99)/100;
  let show = ["#showpoints", "#showline", "#showconfidence", "#showprediction"].map(id => $(id).checked);
  window.output = output;
  let m = 50;
  let canvas = document.querySelector("#canvas");
  let ctx = canvas.getContext("2d");
  let residCanvas = $("#residualPlot");
  let rctx = residCanvas.getContext("2d");
  ctx.fillStyle = getComputedStyle(document.body).backgroundColor;
  ctx.textAlign = rctx.textAlign = "center";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  rctx.fillStyle = getComputedStyle(document.body).backgroundColor;
  rctx.fillRect(0, 0, residCanvas.width, residCanvas.height);
  ctx.fillStyle = "black";
  ctx.font = "20px Times";
  ctx.fillText(`${transConvertedY} vs ${convert(xName)}`, canvas.width/2, m-10);
  ctx.lineWidth = 2;
  line(ctx, m, m, m, canvas.height-m);
  line(ctx, m, canvas.height-m, canvas.width-m, canvas.height-m);
  let maxX = output.data.reduce((a, b) => Math.max(b[0], a), 0)*1.1;
  let xStep = ceil(maxX/10, 10**magnitude(maxX/10));
  while (maxX/xStep < 5) xStep /= 2;
  maxX = Math.floor(maxX/xStep)*xStep+xStep/2;
  for (let i = 0; i <= (canvas.width-2*m); i+=(canvas.width-2*m)*xStep/maxX) {
    line(ctx, i+m, canvas.height-m*1.25, i+m, canvas.height-m*3/4);
    ctx.font = "12px Arial";
    ctx.fillText(trunc(i*maxX/(canvas.width-2*m)), i+m, canvas.height-m*1/2);
  }
  ctx.font = "20px Times";
  ctx.fillText(convert(xName), ctx.canvas.width/2, canvas.height-m*1/8)
  let maxY = output.data.reduce((a, b) => Math.max(b[1], a), 0)*1.05;
  let yStep = ceil(maxY/10, 10**magnitude(maxY/10));
  while (maxY/yStep < 5) yStep /= 2;
  maxY = Math.floor(maxY/yStep)*yStep+yStep;
  for (let i = canvas.height-m; i >= m; i-=(canvas.height-2*m)*yStep/maxY) {
    line(ctx, 3*m/4, i, m*1.25, i);
    ctx.font = "12px Arial";
    drawRotatedText(ctx, trunc((canvas.height-m-i)*maxY/(canvas.height-2*m)), 2*m/3, i, 3*Math.PI/2);
  }
  ctx.font = "20px Times";
  drawRotatedText(ctx, transConvertedY, m/3, canvas.height/2, 3*Math.PI/2);
  ctx.lineWidth = 2;
  let translate = (x, y) => [m+(canvas.width-2*m)/maxX*x, canvas.height-m-(canvas.height-2*m)/maxY*y];
  ctx.fillStyle = "black";
  for (let pair of output.data) {
    if (!show[0]) break;
    circle(ctx, ...translate(...pair), 3);
  }
  let startX = Math.max(0, -output.a/output.b*output.b/Math.abs(output.b));
  ctx.lineWidth = 1;
  let lastLine = [];
  for (let i = 0; i < maxX; i += (maxX-startX)/300) {
    let prediction = output.predict(i, confidence).slice(0);
    if (lastLine.length !== 0) lastLine.forEach(function(el, idx) {
      ctx.lineWidth = (idx === 0) ? 3 : (idx === 1 || idx === 2 ? 1.5 : 1);
      if ((!show[1] && idx === 0) || (!show[2] && (idx === 1 || idx === 2)) || (!show[3] && (idx === 3 || idx === 4))) return;
      if (el >= 0 && prediction[idx] <= maxY) line(ctx, ...translate(i, prediction[idx]), ...translate(i-(maxX-startX)/300, el));
    });
    lastLine = prediction;
  }

  rctx.lineWidth = 2;
  rctx.fillStyle = "black";
  line(rctx, m, residCanvas.height/2, residCanvas.width-m, residCanvas.height/2);
  line(rctx, m, m, m, residCanvas.height-m);
  let residuals = output.data.toSorted((a, b) => a[0]-b[0]).map(pair => [pair[0], pair[1]-output.predict(pair[0])]);
  let standardizedResiduals = residuals.map(pair => [pair[0], output.sResid < 1e-6 ? 0 : pair[1]/output.sResid]);
  let maxResid = output.sResid < 1e-6 ? 1 : Math.floor(standardizedResiduals.reduce((a, b) => Math.max(a, Math.abs(b[1])), 0)+1);
  let translateResid = (x, y) => [m+x/maxX*(residCanvas.width-m*2), canvas.height/2-(canvas.height-2*m)/(2*maxResid)*y];
  rctx.font = "20px Times";
  drawRotatedText(rctx, "Standardized Residuals", m/4, residCanvas.height/2, Math.PI*3/2);
  rctx.fillText(convert(xName), residCanvas.width/2, residCanvas.height-m/2);
  rctx.fillText(convert(xName) + " Residual Plot", residCanvas.width/2, m/2);
  for (let i = maxResid; i >= -maxResid; i--) {
    line(rctx, m*3/4, translateResid(0, i)[1], m*1.25, translateResid(0, i)[1]);
    rctx.font = "12px Arial";
    rctx.fillText(i, m/2, translateResid(0, i)[1]+4);
  }
  for (let i = (residCanvas.width-2*m)*xStep/maxX; i <= (residCanvas.width-2*m); i+=(residCanvas.width-2*m)*xStep/maxX) {
    line(rctx, i+m, residCanvas.height/2-m/4, i+m, residCanvas.height/2+m/4);
    rctx.font = "12px Arial";
    rctx.fillText(trunc(i*maxX/(canvas.width-2*m)), i+m, residCanvas.height/2+m*1/2);
  }
  for (let pair of standardizedResiduals) {
    circle(rctx, ...translateResid(pair[0], pair[1]), 3);
  }

  $("#count").innerText = `n = ${output.n}; df = ${output.n-2}`;
  $("#equation").innerText = `${transY} = ${trunc(output.a)} ${output.b<0 ? "–" : "+"} ${trunc(Math.abs(output.b))}${xName}`;
  $("#r").innerText = `r = ${trunc(output.r)}`;
  $("#r2").innerText = `R² = ${trunc(output.r**2*100, 3)}%`;
  $("#slopeT").innerHTML = `t<sub>b</sub> = ${trunc(output.tStatistic)}; p-value = ${trunc(2*tCDF(output.tStatistic, null, output.n-2))}`;
  let error = invT(confidence, output.n-2, 0) * output.b/output.tStatistic;
  $("#slopeInterval").innerText = `${confidence*100}% CI for b: ${trunc(output.b)} ± ${trunc(error)} = (${trunc(output.b-error)}, ${trunc(output.b+error)})`;
  //$("#residuals").innerText = `Residuals: {${residuals.map(pair => pair[0] + ": " + trunc(pair[1])).join(", ")}}`;
  $("#sResid").innerHTML = `S<sub>resid</sub> = ${trunc(output.sResid)}; x̄ = ${trunc(output.meanX)}; ȳ = ${trunc(output.meanY)}; S<sub>x</sub> = ${trunc(output.sdX)};
  S<sub>y</sub> = ${trunc(output.sdY)}; SS<sub>x</sub> = ${trunc(output.ssX)}; SS<sub>y</sub> = ${trunc(output.ssY)}`;

  $("#outputPredictX").innerText = "";
  function predictX() {
    let x = Number($("#predictX").value || 0);
    let prediction = output.predict(x, confidence);
    $("#outputPredictX").innerText = `${transY} = ${trunc(prediction[0])}\n${confidence*100}% CI = ${trunc(prediction[0])} ± ${trunc(prediction[2]-prediction[0])} =` +
    `(${trunc(prediction[1])}, ${trunc(prediction[2])})\n${confidence*100}% PI = ${trunc(prediction[0])} ± ${trunc(prediction[4]-prediction[0])} =` +
    `(${trunc(prediction[3])}, ${trunc(prediction[4])})`;
  }
  $("#enterPredictX").addEventListener("click", predictX);
  addEnterEvent($("#predictX"), predictX);
  $("#outputPredictY").innerText = "";
  function predictY() {
    let y = Number($("#predictY").value || 0);
    let prediction = output.inversePredict(y, confidence);
    $("#outputPredictY").innerText = `${xName} = ${trunc(prediction[0])}\n${confidence*100}% CI = ${trunc(prediction[0])} ± ${trunc(prediction[2]-prediction[0])} =` +
    `(${trunc(prediction[1])}, ${trunc(prediction[2])})\n${confidence*100}% PI = ${trunc(prediction[0])} ± ${trunc(prediction[4]-prediction[0])} =` +
    `(${trunc(prediction[3])}, ${trunc(prediction[4])})`;
  }
  $("#enterPredictY").addEventListener("click", predictY);
  addEnterEvent($("#predictY"), predictY);
}
