function addEnterEvent(el, fn) {
  el.addEventListener("keypress", function(e) {if (e.key === "Enter") fn();});
}

function getValue(input) {
  return Number(input.value === "" ? input.placeholder : input.value);
}

HTMLDivElement.prototype.get = function(selector) {
  return this.querySelector(selector);
};

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
    return [-Math.abs(curr), Math.abs(curr)].map(n => trunc(zScore ? n : n*stddev+mean));
  }
}

function trunc(value, power=5) {
  return Math.round(value * 10**power) / 10**power;
}

let $ = document.querySelector.bind(document);

$("#showcalculator").addEventListener("click", function() {
  $("#showcalculator").disabled = true;
  calculatorElement();
  $(".removeCalculator").addEventListener("click", function() {
    $("#showcalculator").disabled = false;
  });
});

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
  <h2>Normal Distribution</h2>
  <span>µ = </span><input id="mean" placeholder="0" class="limited"></input><br>
  <span>σ = </span><input id="stddev" placeholder="1" class="limited"></input><br>
  <input id="zScore" placeholder="Input a value..."></input> <button id="getZScore">Get zScore</button>
  <br><span id="zScoreOutput"></span><br>
  <input id="invZScore" placeholder="Input a zScore..."></input> <button id="getInvZScore">Get value</button>
  <br><span id="invZScoreOutput"></span><br>
  <span>Normal Cumulative Distribution Function</span> <button id="normalcdf">Enter!</button><br><span>Left Bound:</span> <input id="leftbound" placeholder="unbounded">
  Right Bound: <input id="rightbound" placeholder="unbounded"> as <button id="isZScores" value="false">values</button><br><span id="normalcdfoutput"></span>
  <br><br><span>Inverse Normal Cumulative Distribution Function</span> <button id="invnormalcdf">Enter!</button><br>
  <span>Find</span> <button id="percentiletype" value="-1" style="min-width:60px">bottom</button> <input id="percentile" style="width: 20px" placeholder="25"><span>% percentile as a</span>
  <button id="isZScoreInverse" value="false">value</button><br><span id="invnormalcdfoutput"></span>
  <h2>Sampling Distributions</h2>
  <span>Sampling Distribution of Means</span><button id="samplingMeanEnter">Enter!</button><br><span>µ = </span><input id="meansMean" placeholder="0" class="limited"></input>
  <br><span>σ = </span><input id="meansStddev" placeholder="1" class="limited"></input><br><span>n = </span><input id="meansTotal" placeholder="30" class="limited"></input>
  <br><span id="meansMeanOutput"></span><br><span id="meansStddevOutput"></span><br>
  <span>Sampling Distribution of Proportions</span><button id="samplingProportionEnter">Enter!</button><br><span>p = </span><input id="propProb" placeholder=".5" class="limited"></input>
  <br><span>n = </span><input id="propTotal" placeholder="30" class="limited"></input><br><span id="propMeanOutput"></span><br><span id="propStddevOutput"></span>
  <h3>Two-sample z-test (proportions)</h3><table><tbody id="twosampletable"><tr><td></td><td>x<sub>1</sub></td><td>x<sub>2</sub></td></tr><tr><td>Success</td><td>
  <input id="samplex1success"></input></td><td><input id="samplex2success"></input></td></tr><tr><td>Total</td><td><input id="samplex1total"></input></td>
  <td><input id="samplex2total"></input></tr></tbody></table><span>Calculate
  <input id="confidence" placeholder="95" class="limited"></input>% confidence interval for x<sub>1</sub> - x<sub>2</sub>
  <button id="calcConfidence">Enter!</button><br><span id="confidenceOutput"></span><br><span>Calculate z and p-value for H<sub>a</sub>
  <button id="alternative" value="-1"></button> <button id="calcHypothesis">Enter!</button><br><span id="alternativeOutput"></span>`;
  function getMean() {
    return Number(div.get("#mean").value === "" ? div.get("#mean").placeholder : div.get("#mean").value);
  }
  function getStddev() {
    return Number(div.get("#stddev").value === "" ? div.get("#stddev").placeholder : div.get("#stddev").value);
  }
  function updateZScore() {
    let value = Number(div.get("#zScore").value);
    let mean = getMean(); stddev = getStddev();
    div.get("#zScoreOutput").innerText = "Z: " + trunc((value-mean)/stddev).toString();
  }
  this.querySelector("#zScore").addEventListener("keypress", function(e) {
    if (e.key === "Enter") updateZScore();
  });
  this.querySelector("#getZScore").addEventListener("click", updateZScore);
  function updateInvZScore() {
    let value = Number(div.get("#invZScore").value);
    let mean = getMean(); stddev = getStddev();
    div.get("#invZScoreOutput").innerText = "Value: " + trunc(value * stddev + mean).toString();
  }
  this.querySelector("#invZScore").addEventListener("keypress", function(e) {
    if (e.key === "Enter") updateInvZScore();
  });
  this.querySelector("#getInvZScore").addEventListener("click", updateInvZScore);

  div.get("#isZScores").addEventListener("click", function() {
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
	let isZScores = div.get("#isZScores").value === "true";
    let output = normalRange(numberify(div.get("#leftbound").value), numberify(div.get("#rightbound").value),   mean, stddev, isZScores);
    div.get("#normalcdfoutput").innerText = `normalCDF(${div.get("#leftbound").value || "-∞"}, ${div.get("#rightbound").value || "∞"}` +
    `${div.get("#isZScores").innerText === "zScores" ? "" : `, µ: ${getMean()}, σ: ${getStddev()}`}) = ${trunc(output)}`
  }
  div.get("#normalcdf").addEventListener("click", updateNormalCDF);
  [div.get("#leftbound"), div.get("#rightbound")].forEach(el => el.addEventListener("keypress", function(e) {
    if (e.key === "Enter") updateNormalCDF();
  }));

  div.get("#isZScoreInverse").addEventListener("click", function() {
    this.value = this.value === "true" ? "false" : "true";
    this.innerText = this.value === "true" ? "zScore" : "value";
  });
  div.get("#percentiletype").addEventListener("click", function() {
    this.value = ((Number(this.value) + 2) % 3) - 1;
    this.innerText = ["bottom", "middle", "top"][Number(this.value)+1];
  });
  function updateInvNormalCDF() {
    let percentile = (div.get("#percentile").value ? Number(div.get("#percentile").value) : Number(div.get("#percentile").placeholder))/100;
    let percentileType = Number(div.get("#percentiletype").value);
    let isZScore = div.get("#isZScoreInverse").value === "true";
    let mean = getMean(); stddev = getStddev();
    let output = invNormalRange(percentile, percentileType, mean, stddev, isZScore);
    let stringify = n => Math.abs(n) === Infinity ? n.toString().replace("Infinity", "∞") : trunc(n).toString();
    div.get("#invnormalcdfoutput").innerText = `invNorm(${percentile}, ${div.get("#isZScoreInverse").value === "true" ? "µ: 0, σ: 1" : `µ: ${getMean()}, σ: ${getStddev()}`}, ` +
      `${{'bottom': 'LEFT', 'top': 'RIGHT', 'middle': 'CENTER'}[div.get("#percentiletype").innerText]}) = ` +
      `${percentileType === 0 ? `{${stringify(output[0])} ${stringify(output[1])}}` : stringify(output)}`;
  }
  div.get("#invnormalcdf").addEventListener("click", updateInvNormalCDF);
  div.get("#percentile").addEventListener("keypress", function(e) {if (e.key === "Enter") updateInvNormalCDF()});

  function updateSamplingMean() {
    let mean = getValue(div.get("#meansMean")), stdDev = getValue(div.get("#meansStddev")), n = getValue(div.get("#meansTotal"));
    div.get("#meansMeanOutput").innerHTML = `µ<sub>x̄</sub>: ${mean}`;
    div.get("#meansStddevOutput").innerHTML = `σ<sub>x̄</sub>: ${trunc(stdDev/Math.sqrt(n))}`;
  }
  div.get("#samplingMeanEnter").addEventListener("click", updateSamplingMean);
  addEnterEvent(div.get("#meansMean"), updateSamplingMean);
  addEnterEvent(div.get("#meansStddev"), updateSamplingMean);
  addEnterEvent(div.get("#meansTotal"), updateSamplingMean);
  function updateSamplingProportion() {
    let mean = getValue(div.get("#propProb")), n = getValue(div.get("#propTotal"));
    div.get("#propMeanOutput").innerHTML = `µ<sub>p̂</sub>: ${mean}`;
    div.get("#propStddevOutput").innerHTML = `σ<sub>p̂</sub>: ${trunc(Math.sqrt(mean*(1-mean)/n))}`;
  }
  div.get("#samplingProportionEnter").addEventListener("click", updateSamplingProportion);
  addEnterEvent(div.get("#propProb"), updateSamplingProportion);
  addEnterEvent(div.get("#propTotal"), updateSamplingProportion);

  function get2SampleValues() {
    return ["#samplex1success", "#samplex2success", "#samplex1total", "#samplex2total"]
      .map(str => div.get(str)).map(cell => Number(cell.value));
  }
  function calcConfidence() {
    let values = get2SampleValues();
    let proportions = [values[0]/values[2], values[1]/values[3]];
    let mean = proportions[0]-proportions[1];
    let confidence = Number(div.get("#confidence").value || div.get("#confidence").placeholder) / 100;
    let zscore = invNormalRange(confidence, 0, 0, 1)[1];
    let stdError = Math.sqrt(proportions[0]*(1-proportions[0])/values[2]+proportions[1]*(1-proportions[1])/values[3]);
    div.get("#confidenceOutput").innerText = `${confidence*100}% confidence interval = ` +
      `${trunc(mean)}±${trunc(zscore * stdError, 3)} = (${trunc(mean-zscore*stdError, 3)}, ${trunc(mean+zscore*stdError, 3)})`;
  }
  div.get("#calcConfidence").addEventListener("click", calcConfidence);
  addEnterEvent(div.get("#confidence"), calcConfidence);
  div.get("#alternative").addEventListener("click", function() {
    this.value = (Number(this.value) + 1) % 3;
    this.innerHTML = `x<sub>1</sub> - x<sub>2</sub> ${["≠", ">", "<"][this.value]} 0`;
  });
  div.get("#alternative").click();
  function calcHypothesis() {
    let values = get2SampleValues();
    let proportions = [values[0]/values[2], values[1]/values[3]];
    let mean = proportions[0]-proportions[1];
    let pooled = (values[0]+values[1])/(values[2]+values[3]);
    let z = mean/Math.sqrt(pooled*(1-pooled)/values[2]+pooled*(1-pooled)/values[3]);
    let pvalue = [() => 1-normalRange(-Math.abs(z), Math.abs(z), 0, 1), () => normalRange(z, null, 0, 1), () => normalRange(null, z, 0, 1)][
      Number(div.get("#alternative").value)]();
    div.get("#alternativeOutput").innerHTML = `z = ${trunc(z)}; p-value of ${div.get("#alternative").innerHTML} = ${trunc(pvalue)}`;
  }
  div.get("#calcHypothesis").addEventListener("click", calcHypothesis);
};

$("#discrete").update = function() {
  let div = this;
  div.innerHTML = `<table><tr id="values"><td>x:</td></tr><tr id="probability"><td>P(X=x):</td></tr></table>
  <button id="addCell" class="tablebtn">+</button><button id="removeCell" class="tablebtn">-</button>
  <br><button id="calculate" disabled>Calculate!</button><br><span id="mean"></span><br><span id="stddev"></span>`;
  let cellCount = -1;
  let updateCalcBtn = function() {
    if (Math.abs(getSums()[2] - 1) >= 0.01) {
      div.get("#calculate").disabled = true;
      div.get("#calculate").title = "Probabilities must add up to 1, and each value needs a corresponding probability.";
    } else {
      div.get("#calculate").disabled = false;
      div.get("#calculate").title = "";
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
    div.get("#values").appendChild(value);
    div.get("#probability").appendChild(prob);
    value.querySelector("input").focus();
    value.querySelector("input").addEventListener("input", updateCalcBtn);
    prob.querySelector("input").addEventListener("input", updateCalcBtn);
  }
  addCell();
  function removeCell() {
    if (cellCount > 0) {
      div.get("#values").removeChild(div.get("#value"+cellCount));
      div.get("#probability").removeChild(div.get("#prob"+cellCount));
      cellCount -= 1;
      div.get("#value" + cellCount + " input").focus();
      updateCalcBtn();
    }
  }
  div.get("#addCell").addEventListener("click", addCell);
  div.get("#removeCell").addEventListener("click", removeCell);
  function numberify(str) {
    if (/^[ .]*$/.test(str)) return null;
    if (str.includes("/")) return Number(str.split("/")[0])/Number(str.split("/")[1]);
    return Number.isNaN(Number(str)) ? null : Number(str);
  }
  let getVal = id => numberify(div.get("#value" + id + " input").value);
  let getProb = id => numberify(div.get("#prob" + id + " input").value);
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
  div.get("#calculate").addEventListener("click", function() {
    let sums = getSums();
    div.get("#mean").innerText = "Mean: " + trunc(sums[0]);
    div.get("#stddev").innerText = "Standard Deviation: " + trunc(sums[1]);
    div.get("#calculate").disabled = true;
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
    if (!wholeRegex.test(str) || !(str.match(/[A-Z]/g)||[]).every(letter => letter in dict)) return false;
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
    div.get("#calculate").disabled = false;
  }
  div.get("#combiner").addEventListener("input", function() {
    updateCanCalc();
  });

  let distributionNum = -1;
  function addDistribution() {
    distributionNum += 1;
    let newDiv = document.createElement("div");
    newDiv.innerHTML = `<span>Distribution name:</span> <input class="distname"></input>
    <span>µ: </span><input class="distmean"></input> <span>σ: </span><input class="diststddev"></input>
    <button>✖</button>`;
    newDiv.get(".distname").addEventListener("input", function() {
      if (this.value.length > 1) this.value = this.value[0];
      updateCanCalc();
    });
    newDiv.get("button").addEventListener("click", function() {
      this.parentElement.parentElement.removeChild(this.parentElement);
      updateCanCalc();
    });
    newDiv.get(".distmean").addEventListener("input", updateCanCalc);
    newDiv.get(".diststddev").addEventListener("input", updateCanCalc);
    div.get("#distributions").appendChild(newDiv);
    newDiv.get(".distname").focus();
    return newDiv;
  }

  addDistribution();
  div.get("#addDist").addEventListener("click", addDistribution);

  function getDistributions() {
    let dict = Object.create(null);
    for (let distribution of div.get("#distributions").children) {
      let name = distribution.querySelector(".distname").value, mean = distribution.querySelector(".distmean").value,
        stddev = distribution.querySelector(".diststddev").value;
      if ([name, mean, stddev].every(val => val != "")) {
        dict[name.toUpperCase()] = [Number(mean), Number(stddev)];
      }
    }
    return dict;
  }

  div.get("#calculate").addEventListener("click", function() {
    div.get("#calculate").disabled = true;
    let values = parseCombination(div.get("#combiner").value, getDistributions());
    if (values !== false) {
      div.get("#combinedMean").innerText = "µ: " + trunc(values[0]);
      div.get("#combinedStddev").innerText = "σ: " + trunc(values[1]);
      div.get("#copy").disabled = false;
    } else {
      div.get("#combinedMean").innerText = "";
      div.get("#combinedStddev").innerText = "";
    }
  });
  div.get("#combiner").addEventListener("keypress", function(e) {
    if (e.key === "Enter") div.get("#calculate").click();
  });

  div.get("#copy").addEventListener("click", function() {
    this.disabled = true;
    let newDist = addDistribution();
    newDist.querySelector(".distmean").value = div.get("#combinedMean").innerText.replace("µ: ", "");
    newDist.querySelector(".diststddev").value = div.get("#combinedStddev").innerText.replace("σ: ", "");
  });
};

$("#geometrical").update = function() {
  let div = this;
  div.innerHTML = `<h2>Geometric Distribution</h2><span>p = </span><input id="prob" placeholder=".5" class="limited"></input>
  <h3>Expected value and standard deviation</h3><span>Expected value of trials until success from 1 to </span>
  <input id="trials" placeholder="&infin;" style="width:30px;"> <button id="enterExpected">Enter!</button>
  <br><span id="expectedMean"></span><br><span id="expectedStddev"></span><h3>Geometrical Probability Distribution Functions</h3>
  <span>Probability of getting a success <button id="geomCdfOrPdf" value="pdf">exactly on</button> trial #</span><input id="geomDfTrials" style="width:30px" placeholder="1"></input>
  <button id="geomDfEnter">Enter!</button><br><span id="geomDfOutput"></span>
  <h2>Binomial Distribution</h2><span>p = </span><input id="binomProb" placeholder=".5" class="limited"></input>
  <br><span>n = </span><input id="binomTotal" placeholder="2" class="limited"></input>
  <h3>Expected value and standard deviation</h3><span>Calculate expected value and standard deviation</span><button id="binomEnterExpected">Enter!</button>
  <br><span id="binomExpectedMean"></span><br><span id="binomExpectedStddev"></span><h3>Binomial Probability Distribution Functions</h3>
  <span>Probability of getting<button id="binomCdfOrPdf" value="pdf">exactly</button></span><input id="binomDfTrials" style="width:30px" placeholder="1"></input>
  <span>successes</span><button id="binomDfEnter">Enter!</button><br><span id="binomDfOutput"></span>`;
  function getP() {
    return Number(div.get("#prob").value || div.get("#prob").placeholder);
  }
  function updateExpectedValues() {
    let mean = null, stddev = null, p = getP();
    let trials = div.get("#trials").value === "" ? null : Number(div.get("#trials").value);
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
    div.get("#expectedMean").innerText = "µ: " + trunc(mean, 6);
    div.get("#expectedStddev").innerText = "σ: " + trunc(stddev, 6);
  }
  div.get("#enterExpected").addEventListener("click", updateExpectedValues);

  div.get("#geomCdfOrPdf").addEventListener("click", function() {
    if (this.value === "pdf") {
      this.value = "cdf";
      this.innerText = "on or before";
    } else {
      this.value = "pdf";
      this.innerText = "exactly on";
    }
  });
  function updateGeomDF() {
    let p = getP(), trials = Number(div.get("#geomDfTrials").value || div.get("#geomDfTrials").placeholder);
    let isPdf = div.get("#geomCdfOrPdf").value === "pdf";
    let probability;
    if (isPdf) {
      probability = p * (1-p)**(trials-1);
    } else {
      probability = 0;
      for (let i = 0; i < trials; i++) {
        probability += p * (1-p)**(i);
      }
    }
    div.get("#geomDfOutput").innerText = `geomet${isPdf ? "P" : "C"}DF(${p}, ${trials}) = ${trunc(probability, 6)}`;
  }
  div.get("#geomDfEnter").addEventListener("click", updateGeomDF);
  function getBinomValues() {
    return [Number(div.get("#binomProb").value || div.get("#binomProb").placeholder),
      Number(div.get("#binomTotal").value || div.get("#binomTotal").placeholder)];
  }
  function updateBinomExpectedValues() {
    let mean = null, stddev = null, p = getBinomValues();
    div.get("#binomExpectedMean").innerText = "µ: " + trunc(p[0]*p[1], 6);
    div.get("#binomExpectedStddev").innerText = "σ: " + trunc(Math.sqrt(p[0]*p[1]*(1-p[0])), 6);
  }
  div.get("#binomEnterExpected").addEventListener("click", updateBinomExpectedValues);
  div.get("#binomCdfOrPdf").addEventListener("click", function() {
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
    let p = getBinomValues(), trials = Number(div.get("#binomDfTrials").value || div.get("#binomDfTrials").placeholder);
    let isPdf = div.get("#binomCdfOrPdf").value === "pdf";
    let probability;
    if (isPdf) {
      probability = binomPdf(p[1], p[0], trials);
    } else {
      probability = 0;
      for (let i = 0; i <= trials; i++) {
        probability += binomPdf(p[1], p[0], i);
      }
    }
    div.get("#binomDfOutput").innerText = `binom${isPdf ? "P" : "C"}DF(${p[1]}, ${p[0]}, ${trials}) = ${trunc(probability, 6)}`;
  }
  div.get("#binomDfEnter").addEventListener("click", updatebinomDF);
  addEnterEvent(div.get("#binomDfTrials"), updatebinomDF);
  addEnterEvent(div.get("#geomDfTrials"), updateGeomDF);
  addEnterEvent(div.get("#binomTotal"), updateBinomExpectedValues);
  addEnterEvent(div.get("#binomProb"), updateBinomExpectedValues);
  addEnterEvent(div.get("#trials"), updateExpectedValues);
};

$("#chisquare").update = function() {
  let div = this;
  div.innerHTML = `<h2>𝜒² Test</h2><h3>𝜒² Cumulative Distribution Function</h3><span>Left Bound: </span>
  <input id="chiCDFleftbound" placeholder="0" class="limited"></input><span> Right Bound: </span>
  <input id="chiCDFrightbound" placeholder="∞" class="limited"></input>
  <span> Degrees of freedom: </span><input id="chiCDFdegrees" placeholder="1" class="limited"><button id="chiCDFenter">Enter!</button><br>
  <span id="chiCDFoutput"></span><h2>𝜒² Test for Homogeneity/Independence</h2>
  <button id="indAddRow" style="margin-left:0px;">+ row</button><button id="indMinusRow">- row</button>
  <button id="indAddColumn" style="margin-left:0px;">+ column</button><button id="indMinusColumn">- column</button>
  <table><tbody id="indTable"></tbody></table><span>Calculate chi-squared and p-value</span> <button id="enterInd">Enter!</button>
  <button id="clearExpected" disabled>Clear expected values</button>
  <br><span id="indOutput1"></span><br><span id="indOutput2"></span><h2>𝜒² Test for Goodness of Fit</h2><table><tbody id="gofTable"><tr>
  <td>Observed:</td></tr><tr><td>Expected:</td></tr></tbody></table><button id="addCell" class="tablebtn">+</button>
  <button id="removeCell" class="tablebtn">-</button><br><span>Calculate chi-squared and p-value with expected values as </span>
  <button id="gofIsPercent" value="false">raw values</button> <button id="gofEnter">Enter!</button><br><span id="gofOutput1"></span>
  <br><span id="gofOutput2"></span>
  `;

  function chiSquareTest(observed, expected, isPercentages=false) {
    if (isPercentages) {
      let observedTotal = observed.reduce((a, b) => a+b), percentagesTotal = expected.reduce((a, b) => a+b);
      expected = expected.map(n => n*observedTotal/percentagesTotal);
    }
    let total = 0;
    for (let i = 0; i < observed.length; i++) {
      total += (observed[i]-expected[i])**2 / expected[i];
    }
    return total;
  }

  function gamma(x) { // only works on positive numbers where x is either integer or ends in .5
    let init = x % 1 === 0.5 ? Math.sqrt(Math.PI) : 1;
    for (let i = -(x % 1 - 1); i < x; i++) {
      init *= i;
    }
    return init;
  }

  function chiSquarePDF(x, df) {
    return x**(df/2-1) * Math.E**(-x/2) / 2**(df/2) / gamma(df/2);
  }

  function chiSquareCDF(start, end, df, round=false) {
    let value = 0, step = 0.0001;
    if (end === null || end >= 99) value = 1-chiSquareCDF(0, start, df);
    else {
      for (let i = Math.max(start, 0); i <= end; i += step) {
        let pdf = chiSquarePDF(i, df);
        value += step * (pdf === Infinity ? 0 : pdf);
      }
    }
    if (value <= 0) return 0;
    return round ? trunc(value, Math.min(Math.ceil(Math.abs(Math.log10(value)))+2, 5)) : value;
  }

  function generateExpectedValues(table) {
    let expectedValues = [], columnTotals = [];
    let rowTotals = table.map(row => row.reduce((a, b) => a+b));
    for (let i = 0; i < table[0].length; i++) {
      columnTotals.push(table.map(row => row[i]).reduce((a, b) => a+b));
    }
    let total = rowTotals.reduce((a, b) => a+b);
    for (let i = 0; i < table.length; i++) {
      expectedValues.push([]);
      for (let j = 0; j < table[i].length; j++) {
        expectedValues.at(-1).push(rowTotals[i] * columnTotals[j] / total);
      }
    }
    return expectedValues;
  }

  function updateCDF() {
    let leftbound = Number(div.get("#chiCDFleftbound").value || 0),
      rightbound = div.get("#chiCDFrightbound").value ? Number(div.get("#chiCDFrightbound").value) : null,
      degrees = Number(div.get("#chiCDFdegrees").value || div.get("#chiCDFdegrees").placeholder);
    div.get("#chiCDFoutput").innerText =
      `𝜒²CDF(${leftbound}, ${rightbound || "∞"}, ${degrees}) = ${chiSquareCDF(leftbound, rightbound, degrees, true)}`;
  }
  div.get("#chiCDFenter").addEventListener("click", updateCDF);
  addEnterEvent(div.get("#chiCDFleftbound"), updateCDF);
  addEnterEvent(div.get("#chiCDFrightbound"), updateCDF);
  addEnterEvent(div.get("#chiCDFdegrees"), updateCDF);

  function gofAddCell() {
    let newCell = document.createElement("td");
    newCell.innerHTML = "<input></input>";
    div.get("#gofTable").children[0].appendChild(newCell);
    newCell.children[0].focus();
    div.get("#gofTable").children[1].appendChild(newCell.cloneNode(true));
  }
  gofAddCell(); gofAddCell();
  function gofRemoveCell() {
    for (let el of div.get("#gofTable").children) {
      if (el.children.length > 3) {
        el.removeChild(el.children[el.children.length-1]);
      }
    }
  }
  div.get("#removeCell").addEventListener("click", gofRemoveCell);
  div.get("#addCell").addEventListener("click", gofAddCell);
  div.get("#gofIsPercent").addEventListener("click", function() {
    this.value = this.value === "false" ? "true" : "false";
    this.innerText = this.value === "true" ? "percentages" : "raw values";
  });
  function updateGoodnessofFit() {
    let rows = [...div.get("#gofTable").children].slice(0, 2);
    rows = rows.map(row => [...row.children].slice(1)
      .map(cell => cell.children[0].value === "" ? null : Number(cell.children[0].value)).filter(cell => cell !== null));
    if (rows[0].length === 0 || rows[1].length === 1 || rows[0].length !== rows[1].length) return;
    let chiSquared = chiSquareTest(rows[0], rows[1], div.get("#gofIsPercent").value === "true");
    let p = chiSquareCDF(chiSquared, Infinity, rows[0].length-1, true);
    div.get("#gofOutput1").innerText = `𝜒²: ${trunc(chiSquared)}`;
    div.get("#gofOutput2").innerText = `p-value: ${p}`;
  }
  div.get("#gofEnter").addEventListener("click", updateGoodnessofFit);

  let indGetRows = () => div.get("#indTable").children.length;
  let indGetColumns = () => div.get("#indTable").children[0]?.children.length || 0;
  function indAddRow() {
    let tr = document.createElement("tr");
    let newCell = document.createElement("td");
    newCell.innerHTML = "<input/>";
    for (let i = 0; i < indGetColumns(); i++) {
      tr.appendChild(newCell.cloneNode(true));
    }
    div.get("#indTable").appendChild(tr);
  }
  function indAddColumn() {
    let tr = document.createElement("tr");
    let newCell = document.createElement("td");
    newCell.innerHTML = "<input/>";
    for (let i = 0; i < indGetRows(); i++) {
      div.get("#indTable").children[i].appendChild(newCell.cloneNode(true));
    }
  }
  function removeLastChild(div) {
    if (div.children.length > 0) div.removeChild(div.children[div.children.length-1]);
  }
  function indRemoveRow() {
    if (indGetRows() > 2) removeLastChild(div.get("#indTable"));
  }
  function indRemoveColumn() {
    if (indGetColumns() > 2) {
      for (let i = 0; i < indGetRows(); i++) {
        removeLastChild(div.get("#indTable").children[i]);
      }
    }
  }
  indAddRow(); indAddColumn(); indAddRow(); indAddColumn();
  div.get("#indAddRow").addEventListener("click", indAddRow);
  div.get("#indAddColumn").addEventListener("click", indAddColumn);
  div.get("#indMinusRow").addEventListener("click", indRemoveRow);
  div.get("#indMinusColumn").addEventListener("click", indRemoveColumn);
  function collectIndValues() {
    let observed = [];
    for (let i = 0; i < indGetRows(); i++) {
      observed.push([...div.get("#indTable").children[i].children]
        .map(cell => /^ *$/.test(cell.children[0].value) ? null : Number(cell.children[0].value)));
      if (observed.at(-1).every(n => n === null)) {
        observed.splice(observed.length-1, 1);
        break;
      }
    }
    if (observed.length < 2) return null;
    for (let row of observed) {
      let idx = row.length-1, curr = row.at(-1);
      while (curr === null) {
        row.splice(idx, 1);
        idx -= 1;
        curr = row[idx];
      }
      if (row.includes(null)) return null;
    }
    for (let row of observed) {
      if (row.length < 2 || row.length !== observed[0].length) return null;
    }
    return observed;
  }
  function updateIndValues() {
    let table = collectIndValues();
    if (table === null) return;
    let expectedValues = generateExpectedValues(table);
    clearExpected();
    for (let i = 0; i < expectedValues.length; i++) {
      let row = expectedValues[i];
      for (let j = 0; j < row.length; j++) {
        let span = document.createElement("span");
        span.innerText = trunc(row[j], 2);
        div.get("#indTable").children[i].children[j].appendChild(span);
      }
    }
    div.get("#clearExpected").disabled = false;
    let chiSquared = chiSquareTest(table.flat(), expectedValues.flat());
    let p = chiSquareCDF(chiSquared, null, (table.length-1)*(table[0].length-1), true);
    div.get("#indOutput1").innerText = `𝜒²: ${trunc(chiSquared)}`;
    div.get("#indOutput2").innerText = `p-value: ${p}`;
  }
  function clearExpected() {
    for (let i = 0; i < indGetRows(); i++) {
      for (let j = 0; j < indGetColumns(); j++) {
        let cell = div.get("#indTable").children[i].children[j];
        while (cell.children.length > 1) {
          removeLastChild(cell);
        }
      }
    }
    div.get("#clearExpected").disabled = true;
  }
  div.get("#enterInd").addEventListener("click", updateIndValues);
  div.get("#clearExpected").addEventListener("click", clearExpected);
  document.activeElement.blur();
};
