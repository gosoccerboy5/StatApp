function addEnterEvent(el, fn) {
  el.addEventListener("keypress", function(e) {if (e.key === "Enter") fn();});
}

function normalRange(bottom, top, mean, stddev, zScores=true) {
  if (!zScores) {
    bottom = bottom === null ? null : (bottom-mean)/stddev;
    top = top === null ? null : (top-mean)/stddev;
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

function invNormalRange(percentile, location, mean, stddev, zScore=true) {
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
    return trunc(zScore ? curr : curr*stddev+mean);
  } else {
    return [curr, -curr].map(n => trunc(zScore ? n : n*stddev+mean));
  }
}


function trunc(value, power=5) {
  return Math.round(value * 10**power) / 10**power;
}

let $ = document.querySelector.bind(document);

$("#widgetselect").value = "";
$("#widgetselect").title = "Select a widget:";
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
  this.title = $("option[value='" + this.value + "']").innerText;
  $("#widgetselect option[value='']").disabled = true;
});

$("#normal").update = function() {
  let div = this;
  div.innerHTML = `
  <span>Mean:</span> <input id="mean" placeholder="0"></input><br>
  <span>Standard Deviation</span> <input id="stddev" placeholder="1"></input><br>
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
  function getMean() {
    return Number(div.querySelector("#mean").value === "" ? div.querySelector("#mean").placeholder : div.querySelector("#mean").value);
  }
  function getStddev() {
    return Number(div.querySelector("#stddev").value === "" ? div.querySelector("#stddev").placeholder : div.querySelector("#stddev").value);
  }
  function updateZScore() {
    let value = Number(div.querySelector("#zScore").value);
    let mean = getMean(); stddev = getStddev();
    div.querySelector("#zScoreOutput").innerText = "Z: " + trunc((value-mean)/stddev).toString();
  }
  this.querySelector("#zScore").addEventListener("keypress", function(e) {
    if (e.key === "Enter") updateZScore();
  });
  this.querySelector("#getZScore").addEventListener("click", updateZScore);
  function updateInvZScore() {
    let value = Number(div.querySelector("#invZScore").value);
    let mean = getMean(); stddev = getStddev();
    div.querySelector("#invZScoreOutput").innerText = "Value: " + trunc(value * stddev + mean).toString();
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
    let mean = getMean(); stddev = getStddev();
	let isZScores = div.querySelector("#isZScores").value === "true";
    let output = normalRange(numberify(div.querySelector("#leftbound").value), numberify(div.querySelector("#rightbound").value),   mean, stddev, isZScores);
    div.querySelector("#normalcdfoutput").innerText = `Normal cumulative distribution from ${div.querySelector("#leftbound").value || "-∞"} to ${div.querySelector("#rightbound").value || "∞"}` + 
    ` as ${div.querySelector("#isZScores").innerText}: ${trunc(output * 100)}%`;
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
    let mean = getMean(); stddev = getStddev();
    let output = invNormalRange(percentile, percentileType, mean, stddev, isZScore);
    let stringify = n => Math.abs(n) === Infinity ? n.toString().replace("Infinity", "∞") : n.toString();
    div.querySelector("#invnormalcdfoutput").innerText = `Threshold for ${div.querySelector("#percentiletype").innerText} ${percentile * 100}th percentile` +
      ` as a ${div.querySelector("#isZScoreInverse").innerText}: ${percentileType === 0 ? `between ${stringify(output[0])} and ${stringify(output[1])}` : stringify(output)}`;
  }
  div.querySelector("#invnormalcdf").addEventListener("click", updateInvNormalCDF);
  div.querySelector("#percentile").addEventListener("keypress", function(e) {if (e.key === "Enter") updateInvNormalCDF()});
};

$("#discrete").update = function() {
  let div = this;
  div.innerHTML = `<table><tr id="values"><td>x:</td></tr><tr id="probability"><td>P(X=x):</td></tr></table>
  <button id="addCell" class="tablebtn">+</button><button id="removeCell" class="tablebtn">-</button>
  <br><button id="calculate" disabled>Calculate!</button><br><span id="mean"></span><br><span id="stddev"></span>`;
  let cellCount = -1;
  let updateCalcBtn = function() {
    if (Math.abs(getSums()[2] - 1) >= 0.01) {
      div.querySelector("#calculate").disabled = true;
      div.querySelector("#calculate").title = "Probabilities must add up to 1, and each value needs a corresponding probability.";
    } else {
      div.querySelector("#calculate").disabled = false;
      div.querySelector("#calculate").title = "";
    }
  };
  function addCell() {
    cellCount += 1;
    let value = document.createElement("td");
    let prob = document.createElement("td");
    value.appendChild(document.createElement("input"));
    prob.appendChild(document.createElement("input"));
    value.id = "value" + cellCount;
    prob.id = "prob" + cellCount;
    value.querySelector("input").addEventListener("keydown", function(e) {
      if (e.key === "ArrowDown") prob.querySelector("input").focus();
    });
    prob.querySelector("input").addEventListener("keydown", function(e) {
      if (e.key === "ArrowUp") value.querySelector("input").focus();
    });
    div.querySelector("#values").appendChild(value);
    div.querySelector("#probability").appendChild(prob);
    value.querySelector("input").focus();
    value.querySelector("input").addEventListener("input", updateCalcBtn);
    prob.querySelector("input").addEventListener("input", updateCalcBtn);
  }
  addCell();
  function removeCell() {
    if (cellCount > 0) {
      div.querySelector("#values").removeChild(div.querySelector("#value"+cellCount));
      div.querySelector("#probability").removeChild(div.querySelector("#prob"+cellCount));
      cellCount -= 1;
      div.querySelector("#value" + cellCount + " input").focus();
      updateCalcBtn();
    }
  }
  div.querySelector("#addCell").addEventListener("click", addCell);
  div.querySelector("#removeCell").addEventListener("click", removeCell);
  function numberify(str) {
    if (/^[ .]*$/.test(str)) return null;
    if (str.includes("/")) return Number(str.split("/")[0])/Number(str.split("/")[1]);
    return Number.isNaN(Number(str)) ? null : Number(str);
  }
  let getVal = id => numberify(div.querySelector("#value" + id + " input").value);
  let getProb = id => numberify(div.querySelector("#prob" + id + " input").value);
  function getSums() {
    let probSum = 0, avg = 0, variance = 0;
    for (let i = 0; i <= cellCount; i++) {
      if (getProb(i) !== null && getVal(i) !== null) {
        probSum += getProb(i);
        avg += getVal(i)*getProb(i);
      }
    }
    for (let i = 0; i <= cellCount; i++) {
      if (getProb(i) !== null && getVal(i) !== null) {
        variance += (getVal(i) - avg) ** 2 * getProb(i);
      }
    }
    return [avg, Math.sqrt(variance), probSum];
  }
  div.querySelector("#calculate").addEventListener("click", function() {
    let sums = getSums();
    div.querySelector("#mean").innerText = "Mean: " + trunc(sums[0]);
    div.querySelector("#stddev").innerText = "Standard Deviation: " + trunc(sums[1]);
    div.querySelector("#calculate").disabled = true;
  });
};


$("#combine").update = function() {
  let div = this;
  div.innerHTML = `<h3>Probability Distributions</h3><button id="addDist" style="margin:-1px;">Add distribution</button>
  <div id="distributions"></div><h3>Combining Random Variables</h3>
  <input id="combiner"><br><button id="calculate" disabled style="margin-left:-3px;">Calculate µ and σ</button>
  <button id="copy" disabled>Copy to new distribution</button><br><span id="combinedMean"></span><br><span id="combinedStddev"></span>
  <br><details><summary>Help</summary><p>Enter random variables/probability distributions under the Probability Distributions section
  with a 1 letter name. Under the Combining Variables section, you can add and subtract different random variables, 
  as well as multiplying them by constants and repeating them.
  </p><p>Example: <code>Y*2 - 3X</code><br><code>Y*2</code> is the same as repeating the random variable <code>Y</code> twice, or <code>Y+Y</code>.<br>
  <code>- 3X</code> means we are subtracting the random variable <code>X</code> which is multiplied by a scale of 3.<br>
  Adding, subtracting, multiplying, and repeating all have different effects.</details>`;
  function parseCombination(str, dict, calcValues=true) {
    if (Object.getOwnPropertyNames(dict).length === 0) return false;
    let modelGroup = "-?((\\d*\\.)?\\d+)?([A-Z](\\*(\\d*\\.)?\\d+)?)?"; // something like -1.1X*5
    let wholeRegex = RegExp("^(" + modelGroup + "([+-]))*" + modelGroup + "$");
    str = str.toUpperCase().replace(/ /g, "");
    if (!wholeRegex.test(str) || !str.match(/[A-Z]/g).every(letter => letter in dict)) return false;
    if (!calcValues) return true;
    let mean = null, stddev = null;
    for (let group of str.match(RegExp(modelGroup, "g"))) {
      if (group === "") continue;
      if (/^-?((\d*\.)?\d+)$/.test(group)) {
        mean = Number(group) + (mean === null ? 0 : mean);
        continue;
      }
      let tempMean = dict[group.match(/[A-Z]/)[0]][0], tempStddev = dict[group.match(/[A-Z]/)[0]][1];
      let factor = group.match(/-?((\d*\.)?\d+)?/)?.[0];
      if (factor === "" || factor === null) factor = 1;
        else if (factor === "-") factor = -1;
        else factor = Number(factor);
      let repetitions = group.match(/\*(\d*\.?\d+)/)?.[1];
      if (repetitions === undefined) repetitions = 1;
        else repetitions = Number(repetitions);
      tempMean *= factor;
      tempStddev *= Math.abs(factor);
      tempMean *= repetitions;
      tempStddev *= Math.sqrt(repetitions);
      if (mean === null) {
        mean = tempMean;
        stddev = tempStddev;
      } else {
        mean += tempMean;
        stddev = Math.sqrt(stddev**2+tempStddev**2);
      }
    }
    return [mean, stddev];
  }

  function updateCanCalc() {
    div.querySelector("#calculate").disabled = false;
  }
  div.querySelector("#combiner").addEventListener("input", function() {
    updateCanCalc();
  });

  let distributionNum = -1;
  function addDistribution() {
    distributionNum += 1;
    let newDiv = document.createElement("div");
    newDiv.innerHTML = `<span>Distribution name:</span> <input class="distname"></input>
    <span>µ: </span><input class="distmean"></input> <span>σ: </span><input class="diststddev"></input>
    <button>✖</button>`;
    newDiv.querySelector(".distname").addEventListener("input", function() {
      if (this.value.length > 1) this.value = this.value[0];
      updateCanCalc();
    });
    newDiv.querySelector("button").addEventListener("click", function() {
      this.parentElement.parentElement.removeChild(this.parentElement);
      updateCanCalc();
    });
    newDiv.querySelector(".distmean").addEventListener("input", updateCanCalc);
    newDiv.querySelector(".diststddev").addEventListener("input", updateCanCalc);
    div.querySelector("#distributions").appendChild(newDiv);
    newDiv.querySelector(".distname").focus();
    return newDiv;
  }

  addDistribution();
  div.querySelector("#addDist").addEventListener("click", addDistribution);

  function getDistributions() {
    let dict = Object.create(null);
    for (let distribution of div.querySelector("#distributions").children) {
      let name = distribution.querySelector(".distname").value, mean = distribution.querySelector(".distmean").value,
        stddev = distribution.querySelector(".diststddev").value;
      if ([name, mean, stddev].every(val => val != "")) {
        dict[name.toUpperCase()] = [Number(mean), Number(stddev)];
      }
    }
    return dict;
  }

  div.querySelector("#calculate").addEventListener("click", function() {
    div.querySelector("#calculate").disabled = true;
    let values = parseCombination(div.querySelector("#combiner").value, getDistributions());
    if (values !== false) {
      div.querySelector("#combinedMean").innerText = "µ: " + trunc(values[0]);
      div.querySelector("#combinedStddev").innerText = "σ: " + trunc(values[1]);
      div.querySelector("#copy").disabled = false;
    } else {
      div.querySelector("#combinedMean").innerText = "";
      div.querySelector("#combinedStddev").innerText = "";
    }
  });
  div.querySelector("#combiner").addEventListener("keypress", function(e) {
    if (e.key === "Enter") div.querySelector("#calculate").click();
  });

  div.querySelector("#copy").addEventListener("click", function() {
    this.disabled = true;
    let newDist = addDistribution();
    newDist.querySelector(".distmean").value = div.querySelector("#combinedMean").innerText.replace("µ: ", "");
    newDist.querySelector(".diststddev").value = div.querySelector("#combinedStddev").innerText.replace("σ: ", "");
  });
};

$("#geometrical").update = function() {
  let div = this;
  div.innerHTML = `<h2>Geometric Distribution</h2><span>p = </span><input id="prob" placeholder=".5" style="width:40px;"></input>
  <h3>Expected value and standard deviation</h3><span>Expected value of trials until success from 1 to </span> 
  <input id="trials" placeholder="&infin;" style="width:30px;"> <button id="enterExpected">Enter!</button>
  <br><span id="expectedMean"></span><br><span id="expectedStddev"></span><h3>Geometrical Probability Distribution Functions</h3>
  <span>Probability of getting a success <button id="geomCdfOrPdf" value="pdf">exactly on</button> trial #</span><input id="geomDfTrials" style="width:30px" placeholder="1"></input>
  <button id="geomDfEnter">Enter!</button><br><span id="geomDfOutput"></span>
  <h2>Binomial Distribution</h2><span>p = </span><input id="binomProb" placeholder=".5" style="width:40px;"></input>
  <br><span>n = </span><input id="binomTotal" placeholder="2" style="width:40px;"></input>
  <h3>Expected value and standard deviation</h3><span>Calculate expected value and standard deviation</span><button id="binomEnterExpected">Enter!</button>
  <br><span id="binomExpectedMean"></span><br><span id="binomExpectedStddev"></span><h3>Binomial Probability Distribution Functions</h3>
  <span>Probability of getting<button id="binomCdfOrPdf" value="pdf">exactly</button></span><input id="binomDfTrials" style="width:30px" placeholder="1"></input>
  <span>successes</span><button id="binomDfEnter">Enter!</button><br><span id="binomDfOutput"></span>`;
  function getP() {
    return Number(div.querySelector("#prob").value || div.querySelector("#prob").placeholder);
  }
  function updateExpectedValues() {
    let mean = null, stddev = null, p = getP();
    let trials = div.querySelector("#trials").value === "" ? null : Number(div.querySelector("#trials").value);
    if (trials === null) {
      mean = 1/p;
      stddev = Math.sqrt(1-p)/p;
    } else {
      let dist = [];
      for (let i = 1; i < trials; i++) {
        dist.push([i, p*(1-p)**(i-1)]);
      }
      dist.push([trials, 1-dist.reduce((a, b) => a+b[1], 0)]);
      mean = dist.reduce((a, b) => a+b[0]*b[1], 0);
      stddev = Math.sqrt(dist.reduce((a, b) => a+(b[0]-mean)**2 * b[1], 0));
    }
    div.querySelector("#expectedMean").innerText = "µ: " + trunc(mean, 6);
    div.querySelector("#expectedStddev").innerText = "σ: " + trunc(stddev, 6);
  }
  div.querySelector("#enterExpected").addEventListener("click", updateExpectedValues);
  
  div.querySelector("#geomCdfOrPdf").addEventListener("click", function() {
    if (this.value === "pdf") {
      this.value = "cdf";
      this.innerText = "on or before";
    } else {
      this.value = "pdf";
      this.innerText = "exactly on";
    }
  });
  function updateGeomDF() {
    let p = getP(), trials = Number(div.querySelector("#geomDfTrials").value || div.querySelector("#geomDfTrials").placeholder);
    let isPdf = div.querySelector("#geomCdfOrPdf").value === "pdf";
    let probability;
    if (isPdf) {
      probability = p * (1-p)**(trials-1);
    } else {
      probability = 0;
      for (let i = 0; i < trials; i++) {
        probability += p * (1-p)**(i);
      }
    }
    div.querySelector("#geomDfOutput").innerText = `geomet${isPdf ? "P" : "C"}DF(${p}, ${trials}) = ${trunc(probability, 6)}`;
  }
  div.querySelector("#geomDfEnter").addEventListener("click", updateGeomDF);
  function getBinomValues() {
    return [Number(div.querySelector("#binomProb").value || div.querySelector("#binomProb").placeholder),
      Number(div.querySelector("#binomTotal").value || div.querySelector("#binomTotal").placeholder)];
  }
  function updateBinomExpectedValues() {
    let mean = null, stddev = null, p = getBinomValues();
    div.querySelector("#binomExpectedMean").innerText = "µ: " + trunc(p[0]*p[1], 6);
    div.querySelector("#binomExpectedStddev").innerText = "σ: " + trunc(Math.sqrt(p[0]*p[1]*(1-p[0])), 6);
  }
  div.querySelector("#binomEnterExpected").addEventListener("click", updateBinomExpectedValues);
  div.querySelector("#binomCdfOrPdf").addEventListener("click", function() {
    if (this.value === "pdf") {
      this.value = "cdf";
      this.innerText = "at most";
    } else {
      this.value = "pdf";
      this.innerText = "exactly";
    }
  });
  function updatebinomDF() {
    function binomPdf(n, p, k) {
      let total = 0;
      for (let i = 1; i <= n; i++) {
        total += (i <= k ? Math.log(p/i) : 0) + (i <= (n-k) ? Math.log((1-p)/i) : 0) + Math.log(i);
      }
      return Math.E**total;
    }
    let p = getBinomValues(), trials = Number(div.querySelector("#binomDfTrials").value || div.querySelector("#binomDfTrials").placeholder);
    let isPdf = div.querySelector("#binomCdfOrPdf").value === "pdf";
    let probability;
    if (isPdf) {
      probability = binomPdf(p[1], p[0], trials);
    } else {
      probability = 0;
      for (let i = 0; i <= trials; i++) {
        probability += binomPdf(p[1], p[0], i);
      }
    }
    div.querySelector("#binomDfOutput").innerText = `binom${isPdf ? "P" : "C"}DF(${p[1]}, ${p[0]}, ${trials}) = ${trunc(probability, 6)}`;
  }
  div.querySelector("#binomDfEnter").addEventListener("click", updatebinomDF);
  addEnterEvent(div.querySelector("#binomDfTrials"), updatebinomDF);
  addEnterEvent(div.querySelector("#geomDfTrials"), updateGeomDF);
  addEnterEvent(div.querySelector("#binomTotal"), updateBinomExpectedValues);
  addEnterEvent(div.querySelector("#binomProb"), updateBinomExpectedValues);
  addEnterEvent(div.querySelector("#trials"), updateExpectedValues);
};
