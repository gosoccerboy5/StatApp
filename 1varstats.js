class Dataset {
  constructor(list) {
    this.list = list.map(a => a);
    this.list.sort((a, b) => (a - b));
    this.count = this.list.length;
    let sum = this.list.reduce((a, b) => a+b);
    this.mean = sum/this.count;
    sum = 0;
    for (let item of this.list) {
      sum += (item - this.mean)**2;
    }
    this.stddev = Math.sqrt(sum/(this.count-1));
    this.min = this.list[0];
    this.max = this.list.at(-1);
    this.range = this.max - this.min;
    this.median = this.count % 2 === 0 ? 
      (this.list[this.count/2] + this.list[this.count/2-1])/2 : this.list[Math.floor(this.count/2)];
    let low = this.list.slice(0, Math.floor(this.list.length/2)), high = this.list.slice(Math.ceil(this.list.length/2));
    this.q1 = low.length % 2 === 0 ? (low[low.length/2]+low[low.length/2-1])/2 : low[Math.floor(low.length/2)];
    this.q3 = high.length % 2 === 0 ? (high[high.length/2]+high[high.length/2-1])/2 : high[Math.floor(high.length/2)];
    this.IQR = this.q3 - this.q1;
  }
  frequency(value) {
    return this.list.filter(a => a === value).length;
  }
  frequencyRate(value) {
    return this.frequency(value)/this.count;
  }
  zScore(value) {
    return value === null ? null : (value-this.mean)/this.stddev;
  }
  invZScore(zScore) {
    return zScore * this.stddev + this.mean;
  }
  normalRange(bottom, top, zScores=true) {
    if (!zScores) {
      bottom = this.zScore(bottom);
      top = this.zScore(top);
    }
    function integrate(fn, bottom, top, step) {
      step = step !== undefined ? Math.max(0.0001, Math.abs(step)) : 0.001;
      let backwards = bottom > top;
      if (top < bottom) {bottom += top; top = bottom - top; bottom = bottom - top;}
      let sum = 0, currentStep = step;
      for (let i = bottom; i < top;) {
        let val = fn(i);
        sum += val * currentStep;
        currentStep = Math.min(step, top-i);
        i += currentStep;
      }
      return Math.round(sum * 10000)/10000 * (backwards ? -1 : 1);
    }
    let normalDistributionFn = x => ((1/Math.sqrt(2*Math.PI))*(Math.E**(-.5*(x**2))));
    return Math.round((integrate(normalDistributionFn, bottom || 0, top || 0, 0.0001) +
      [bottom, top].filter(x=>x===null).length * 0.5)*10000)/10000;
  }
  invNormalRange(percentile, location, zScore=true) {
    percentile = Math.min(Math.max(percentile, 0), 1);
    if (percentile === 1 || (percentile === 0 && location !== 0)) return location === 0 ? [-Infinity, Infinity] : (location === 1 ? -1 : 1) * (percentile === 0 ? -1 : 1) * Infinity;
    let increment = (Math.abs(percentile-0.5)/(percentile-0.5) || 1) * 0.0001, curr = 0, sum = 0;
    let normalDistributionFn = x => ((1/Math.sqrt(2*Math.PI))*(Math.E**(-.5*(x**2))));
    let cond = location === 0 ?  () => Math.abs(sum) < percentile/2 : () => Math.abs(sum) < Math.abs(percentile-0.5);
    while (cond()) {
      sum += normalDistributionFn(curr) * increment;
      curr += increment;
    }
    curr = location === 1 ? -curr : curr;
    if (location !== 0) {
      return trunc(zScore ? curr : this.invZScore(curr));
    } else {
      return [curr, -curr].map(n => trunc(zScore ? n : this.invZScore(n)));
    }
  }
}

function trunc(value) {
  return Math.round(value * 1000) / 1000;
}

let $ = document.querySelector.bind(document);
let dataset = null;
function updateDataset() {
  try {
    dataset = new Dataset($("#data").value.replaceAll(/(-?\d*\.?\d+) +(-?\d*\.?\d+)/g, "$1,$2,")
      .replaceAll(/[ \n]/g, "")
      .replaceAll(/-?\d*(\.\d+)?\*\d+/g, function(match) {
        let combined = "";
        for (let i = 0; i < Number(match.split("*")[1]); i++) {
          combined += match.split("*")[0] + ",";
        }
        return combined;
      })
      .split(/,+/).filter(n => n !== "").map(Number));
    $("#widgetselect").disabled = false;
    $("#enter").disabled = true;
    $("#data").value = dataset.list.join(", ");
    if ($("#widgetselect").value !== "") {
      $("#" + $("#widgetselect").value).update();
    }
  } catch (e) {
    console.log(e);
    $("#widgetselect").disabled = true;
    $("#widgetselect").value = "";
  }
}
$("#data").addEventListener("keypress", function(e) {
  if (e.key === "Enter") {
    e.preventDefault();
    updateDataset();
  }
});
$("#enter").addEventListener("click", updateDataset);

$("#data").focus();
$("#widgetselect").disabled = true;
$("#widgetselect").value = "";
$("#widgetselect").addEventListener("change", function(e) {
  for (let child of $("#widgetdisplay").children) {
    if (child.id !== this.value) {
      child.style.visibility = "hidden";
      child.innerHTML = "";
    } else {
      child.style.visibility = "";
      child.update();
    }
  }
  $("#widgetselect option[value='']").disabled = true;
});

$("#save").addEventListener("click", function() {
  localStorage.setItem("saved", $("#data").value);
  this.disabled = true;
});
window.addEventListener("load", function() {
  if (localStorage.getItem("saved") !== null) {
    $("#data").value = localStorage.getItem("saved");  
    $("#save").disabled = true;
  }
});
$("#data").addEventListener("input", function() {
  $("#save").disabled = false;
  $("#enter").disabled = false;
});


$("#generaldata").update = function() {
  this.innerHTML = "";
  let table = document.createElement("table");
  for (let datum of [["Total # of data", dataset.count], ["Mean", trunc(dataset.mean)], ["Standard Deviation", trunc(dataset.stddev)], ["Min", dataset.min], 
    ["Q1", dataset.q1], ["Median", dataset.median], ["Q3", dataset.q3], ["Max", dataset.max], ["IQR", dataset.IQR], ["Range", dataset.range]]) {
    let tr = document.createElement("tr");
    let td1 = document.createElement("td");
    td1.innerText = datum[0] + ": ";
    let td2 = document.createElement("td");
    td2.innerText = datum[1].toString();
    tr.append(td1);
    tr.append(td2);
    table.append(tr);
  }
  this.append(table);
};

$("#frequencystats").update = function() {
  this.innerHTML = "<input id='freq' placeholder='Input a value...'></input> <button id='freqenter'>Enter</button><br><span id='span1'></span><br><span id='span2'></span>";
  function updatefrequency() {
    let value = Number($("#frequencystats").querySelector("#freq").value);
    $("#frequencystats").querySelector("#freq").value = value;
    $("#frequencystats").querySelector("#span1").innerText = "Frequency: " + dataset.frequency(value).toString();
    $("#frequencystats").querySelector("#span2").innerText = "Frequency Rate: " + 
      (trunc(dataset.frequencyRate(value))*100).toString() + "%";
  }
  this.querySelector("#freq").addEventListener("keypress", function(e) {
    if (e.key === "Enter") {
      updatefrequency();
    }
  });
  this.querySelector("#freqenter").addEventListener("click", updatefrequency);
};

$("#normal").update = function() {
  let div = this;
  div.innerHTML = `
  <span>Mean:</span> <input id="mean" disabled></input> <button id="editmean">Edit (temporarily)</button><br>
  <span>Standard Deviation</span> <input id="stddev" disabled></input><button id="editstddev">Edit (temporarily)</button><br>
  <input id="zScore" placeholder="Input a value..."></input> <button id="getZScore">Get zScore</button>
  <br><span id="zScoreOutput"></span><br>
  <input id="invZScore" placeholder="Input a zScore..."></input> <button id="getInvZScore">Get value</button>
  <br><span id="invZScoreOutput"></span><br>
  <span>Normal Cumulative Distribution Function</span> <button id="normalcdf">Enter!</button><br><span>Left Bound:</span> <input id="leftbound" placeholder="unbounded"> 
  Right Bound: <input id="rightbound" placeholder="unbounded"> as <button id="isZScores" value="true">zScores</button><br><span id="normalcdfoutput"></span>
  <br><br><span>Inverse Normal Cumulative Distribution Function</span> <button id="invnormalcdf">Enter!</button><br>
  <span>Find</span> <button id="percentiletype" value="-1" style="min-width:60px">bottom</button> <input id="percentile" style="width: 20px" placeholder="25"><span>% percentile as a</span>
  <button id="isZScoreInverse" value="true">zScore</button><br><span id="invnormalcdfoutput"></span>
  `;
  div.querySelector("#mean").placeholder = trunc(dataset.mean).toString();
  div.querySelector("#stddev").placeholder = trunc(dataset.stddev).toString();
  [div.querySelector("#editmean"), div.querySelector("#editstddev")].forEach(el => el.addEventListener("click", function() {
    div.querySelector("#" + el.id.replace("edit", "")).disabled = false;
    div.querySelector("#" + el.id.replace("edit", "")).focus();
    el.style.visibility = "hidden";
  }));
  function getMean() {
    return Number(div.querySelector("#mean").value === "" ? dataset.mean : div.querySelector("#mean").value);
  }
  function getStddev() {
    return Number(div.querySelector("#stddev").value === "" ? dataset.stddev : div.querySelector("#stddev").value);
  }
  function updateZScore() {
    let value = Number(div.querySelector("#zScore").value);
    let oldmean = dataset.mean, oldStddev = dataset.stddev;
    dataset.mean = getMean(); dataset.stddev = getStddev();
    div.querySelector("#zScoreOutput").innerText = "Z: " + trunc(dataset.zScore(value)).toString();
    dataset.mean = oldmean; dataset.stddev = oldStddev;
  }
  this.querySelector("#zScore").addEventListener("keypress", function(e) {
    if (e.key === "Enter") updateZScore();
  });
  this.querySelector("#getZScore").addEventListener("click", updateZScore);
  function updateInvZScore() {
    let value = Number(div.querySelector("#invZScore").value);
    let oldmean = dataset.mean, oldStddev = dataset.stddev;
    dataset.mean = getMean(); dataset.stddev = getStddev();
    div.querySelector("#invZScoreOutput").innerText = "Value: " + trunc(dataset.invZScore(value)).toString();
    dataset.mean = oldmean; dataset.stddev = oldStddev;
  }
  this.querySelector("#invZScore").addEventListener("keypress", function(e) {
    if (e.key === "Enter") updateInvZScore();
  });
  this.querySelector("#getInvZScore").addEventListener("click", updateInvZScore);

  div.querySelector("#isZScores").addEventListener("click", function() {
    if (this.value === "true") {
      this.value = "false";
      this.innerText = "values";
    } else {
      this.value = "true";
      this.innerText = "zScores";
    }
  });
  let numberify = value => value === "" ? null : Number(value);
  function updateNormalCDF() {
    let oldmean = dataset.mean, oldStddev = dataset.stddev;
    dataset.mean = getMean(); dataset.stddev = getStddev();
    let output = dataset.normalRange(numberify(div.querySelector("#leftbound").value), numberify(div.querySelector("#rightbound").value), div.querySelector("#isZScores").value === "true");
    div.querySelector("#normalcdfoutput").innerText = `Normal cumulative distribution from ${div.querySelector("#leftbound").value || "-∞"} to ${div.querySelector("#rightbound").value || "∞"}` + 
    ` as ${div.querySelector("#isZScores").innerText}: ${trunc(output * 100)}%`;
    dataset.mean = oldmean; dataset.stddev = oldStddev;
  }
  div.querySelector("#normalcdf").addEventListener("click", updateNormalCDF);
  [div.querySelector("#leftbound"), div.querySelector("#rightbound")].forEach(el => el.addEventListener("keypress", function(e) {
    if (e.key === "Enter") updateNormalCDF();
  }));

  div.querySelector("#isZScoreInverse").addEventListener("click", function() {
    this.value = this.value === "true" ? "false" : "true";
    this.innerText = this.value === "true" ? "zScore" : "value";
  });
  div.querySelector("#percentiletype").addEventListener("click", function() {
    this.value = ((Number(this.value) + 2) % 3) - 1;
    this.innerText = ["bottom", "middle", "top"][Number(this.value)+1];
  });
  function updateInvNormalCDF() {
    let percentile = (div.querySelector("#percentile").value ? Number(div.querySelector("#percentile").value) : Number(div.querySelector("#percentile").placeholder))/100;
    let percentileType = Number(div.querySelector("#percentiletype").value);
    let isZScore = div.querySelector("#isZScoreInverse").value === "true";
    let oldmean = dataset.mean, oldStddev = dataset.stddev;
    dataset.mean = getMean(); dataset.stddev = getStddev();
    let output = dataset.invNormalRange(percentile, percentileType, isZScore);
    let stringify = n => Math.abs(n) === Infinity ? n.toString().replace("Infinity", "∞") : n.toString();
    div.querySelector("#invnormalcdfoutput").innerText = `Threshold for ${div.querySelector("#percentiletype").innerText} ${percentile * 100}th percentile` +
      ` as a ${div.querySelector("#isZScoreInverse").innerText}: ${percentileType === 0 ? `between ${stringify(output[0])} and ${stringify(output[1])}` : stringify(output)}`;
    dataset.mean = oldmean; dataset.stddev = oldStddev;
  }
  div.querySelector("#invnormalcdf").addEventListener("click", updateInvNormalCDF);
  div.querySelector("#percentile").addEventListener("keypress", function(e) {if (e.key === "Enter") updateInvNormalCDF()});
};

function drawLine(ctx, x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.closePath();
}

$("#histogram").update = function() {
  let div = this;
  this.innerHTML = `<span>Step: </span><input id="step"></input> <span>Show bin size?</span>
  <input type="checkbox" checked id="binsize"></input> <span>Approximate normal curve?</span>
  <input type="checkbox" id="normal"></input><br>`;
  let canvas = document.createElement("canvas");
  canvas.width = canvas.height = 500;
  canvas.style.width = canvas.style.height = "500px";
  this.append(canvas);
  function getBins(data, start, step) {
    let bins = [0];
    let currBin = 0;
    for (let item of data) {
      while (item >= currBin*step + step + start) {
        currBin += 1;
        bins[currBin] = 0;
      }
      bins[currBin] += 1;
    }
    return bins;
  }
  
  function drawHistogram(canvas, start, step, count, freqStep, freqStepCount, bins) {
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    if (step <= 0) step = 1;
    if (freqStep <= 0) freqStep = 1;
    let ctx = canvas.getContext("2d");
    let margin = 25;
    let totalWidth = canvas.width-2*margin;
    ctx.strokeStyle = "black";
    drawLine(ctx, margin, canvas.width-margin, margin, margin);
    drawLine(ctx, margin, canvas.width-margin, canvas.width-margin, canvas.width-margin);
    for (let i = 0; i <= freqStepCount; i+=freqStep) {
      drawLine(ctx, margin-7, canvas.height-margin-i*totalWidth/freqStepCount, margin+7, canvas.height-margin-i*totalWidth/freqStepCount);
      ctx.textAlign = "center";
      ctx.fillText(i, 9, canvas.height-margin-i*totalWidth/freqStepCount+3);
    }
    for (let i = 0; i <= count; i += 1) {
      ctx.textAlign = "center";
      drawLine(ctx, margin+i*totalWidth/count, canvas.width-margin-7, margin+i*totalWidth/count, canvas.width-margin+7);
      let height = canvas.height-margin-bins[i]*totalWidth/freqStepCount;
      if (bins[i] > 0) {
        ctx.fillStyle = "steelblue";
        ctx.fillRect(margin+i*totalWidth/count, height, totalWidth/count, bins[i]*totalWidth/freqStepCount);
        ctx.fillStyle = "black";
        drawLine(ctx, margin+i*totalWidth/count, height, margin+i*totalWidth/count+totalWidth/count, height);
        drawLine(ctx, margin+i*totalWidth/count, canvas.height-margin, margin+i*totalWidth/count, height);
        drawLine(ctx, margin+(i+1)*totalWidth/count, canvas.height-margin, margin+(i+1)*totalWidth/count, height);
        if (div.querySelector("#binsize").checked) {
          ctx.fillText(bins[i], margin+(i+.5)*totalWidth/count, height-3);
        }
      }
      ctx.fillText(trunc(i*step+start), 20+i*totalWidth/count+5, canvas.height-6);
    }
    if (div.querySelector("#normal").checked) {
      let normalDistributionFn = x => ((1/Math.sqrt(2*Math.PI))*(Math.E**(-.5*(x**2))));
      let prev = null, normalCurveStep = step*count/100, highest = Math.max(...bins);
      for (let i = 0; i <= step*count+normalCurveStep; i+=normalCurveStep) {
        let curr = normalDistributionFn(dataset.zScore(i+start));
        if (prev !== null) {
          drawLine(ctx, (i-normalCurveStep)*totalWidth/step/count+margin, canvas.height-margin-(prev*highest*totalWidth/freqStepCount/0.4), i*totalWidth/step/count+margin, canvas.height-margin-(curr*highest*totalWidth/freqStepCount/0.4))
        }
        prev = curr;
      }
    }
  }
  function draw() {
    let step = div.querySelector("#step").value ? Number(div.querySelector("#step").value) : Math.ceil(dataset.range/10);
    step = Math.max(step, dataset.range/100);
    if (step === 0) step = 1;
    div.querySelector("#step").placeholder = Math.ceil(dataset.range/10);
    let bins = getBins(dataset.list, dataset.min, step);
    let highestCount = Math.max(...bins);
    let freqStepCount = Math.ceil(highestCount/5)*5, freqStep = freqStepCount/5;
    drawHistogram(canvas, dataset.min, step,  bins.length, freqStep, freqStepCount, bins);
  }
  draw();
  [div.querySelector("#step"), div.querySelector("#normal"), div.querySelector("#binsize")].forEach(el => 
    el.addEventListener("input", draw));
  div.querySelector("#step").addEventListener("keypress", function(e) {
    if (e.key === "Enter") draw();
  });
};

$("#boxplot").update = function() {
  this.innerHTML = "";
  let div = this;
  let canvas = document.createElement("canvas");
  canvas.width = 500;
  canvas.height = 200;
  canvas.style.width = "500px";
  canvas.style.height = "200px";
  div.append(canvas);

  function drawBoxplot() {
    let ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let margin = 20;
    drawLine(ctx, margin, canvas.height-margin, canvas.width-margin, canvas.height-margin);
    let width = canvas.width-margin-margin;

    let step = Math.ceil(dataset.range/10);
    let start = dataset.min - Math.floor(step/2);
    let count = step === 0 ? 1 : Math.ceil(dataset.range/step) + 1;

    for (let i = 0; i <= count; i+=1) {
      ctx.textAlign = "center";
      drawLine(ctx, i*width/count+margin, canvas.height-margin-10, i*width/count+margin, canvas.height-margin+10);
      ctx.fillText(i*step+start, i*width/count+margin, canvas.height-margin + 19);
    }

    let lowFence = dataset.q1 - 1.5*dataset.IQR;
    lowFence = dataset.list.find(n => n >= lowFence);
    let highFence = dataset.q3 + 1.5*dataset.IQR;
    highFence = dataset.list.findLast(n => n <= highFence);
    let getX = n => (n-start)*width/count/step+margin;

    for (let item of dataset.list) {
      if (item < lowFence || item > highFence) {
        ctx.beginPath();
        ctx.arc(getX(item), (canvas.height-margin)/2, 2, 0, Math.PI*2);
        ctx.fillStyle = "black";
        ctx.fill();
        ctx.closePath();
      }
    }
    ctx.fillStyle = "steelblue";
    ctx.lineWidth = 1.2;
    ctx.fillRect(getX(dataset.q1), (canvas.height-margin)/2-30, dataset.IQR * width/count/step, 60);
    drawLine(ctx, getX(dataset.q1), (canvas.height-margin)/2-30, getX(dataset.q1), (canvas.height-margin)/2+30);
    drawLine(ctx, getX(dataset.median), (canvas.height-margin)/2-30, getX(dataset.median), (canvas.height-margin)/2+30);
    drawLine(ctx, getX(dataset.q3), (canvas.height-margin)/2-30, getX(dataset.q3), (canvas.height-margin)/2+30);
    drawLine(ctx, getX(dataset.q1), (canvas.height-margin)/2-30, getX(dataset.q3), (canvas.height-margin)/2-30);
    drawLine(ctx, getX(dataset.q1), (canvas.height-margin)/2+30, getX(dataset.q3), (canvas.height-margin)/2+30);
    drawLine(ctx, getX(lowFence), (canvas.height-margin)/2-10, getX(lowFence), (canvas.height-margin)/2+10);
    drawLine(ctx, getX(highFence), (canvas.height-margin)/2-10, getX(highFence), (canvas.height-margin)/2+10);
    drawLine(ctx, getX(lowFence), (canvas.height-margin)/2, getX(dataset.q1), (canvas.height-margin)/2);
    drawLine(ctx, getX(highFence), (canvas.height-margin)/2, getX(dataset.q3), (canvas.height-margin)/2);
    ctx.lineWidth = 1;
  }
  drawBoxplot();
};
