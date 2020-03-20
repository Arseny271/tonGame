class Checkbox {
  constructor(elem, text) {
    this.container = elem.createChildren("label", "checkbox")

    this.checkbox = this.container.createChildren("input")
    this.checkbox.type = "checkbox"
    this.container.createChildren("span")
    this.container.createChildren("t", "", text)
  }

  setOn() {
    this.checkbox.checked = true
  }
  setOff() {
    this.checkbox.checked = false
  }

  set onchange(func) {
    this.checkbox.onchange = func
  }

  get checked() {
    return this.checkbox.checked
  }
}

const SLIDER_NONE  = 0;
const SLIDER_LEFT  = 1;
const SLIDER_RIGHT = 2;
class Slider {
	constructor(elem, text) {
    const mainCont = elem.createDiv("slicer")
    this.container = mainCont.createDiv("slicer-line")
    mainCont.createChildren("t", "", text)

    this.center  = this.container.createDiv("slicer-slice")
    this.leftSl  = this.container.createDiv("slicer-point")
    this.rightSl = this.container.createDiv("slicer-point")

    this.leftInfo = this.leftSl.createDiv("point-value point-value-left")
    this.rightInfo = this.rightSl.createDiv("point-value point-value-right")

    this.activedSl = SLIDER_NONE;

    this.setPositions(0, 100)

    if ('ontouchstart' in document.documentElement) {
      this.leftSl.ontouchstart = () => {
        this.activedSl = SLIDER_LEFT
        this.addListener()
      }
      this.rightSl.ontouchstart = () => {
        this.activedSl = SLIDER_RIGHT
        this.addListener()
      }
    } else {
      this.leftSl.onmousedown = () => {
        this.activedSl = SLIDER_LEFT
        this.addListener()
      }
      this.rightSl.onmousedown = () => {
        this.activedSl = SLIDER_RIGHT
        this.addListener()
      }
    }

    this.onMouseMove = this.onMouseMove.bind(this)
    this.onMouseUp = this.onMouseUp.bind(this)
	}

  onMouseMove(event) {
    const slicerStart = this.container.getBoundingClientRect().left
    const slicerWidth = this.container.clientWidth

    const eventTouch = ('ontouchstart' in document.documentElement) ? event.targetTouches[0] : event
    const slicerPos = (eventTouch.pageX - slicerStart) / slicerWidth * 100

    if (this.activedSl == SLIDER_LEFT) {
      const newPos = numberBorders(slicerPos, 0, this.positionRight - 10)
      this.setPositions(newPos, this.positionRight)
    } else if (this.activedSl == SLIDER_RIGHT) {
      const newPos = numberBorders(slicerPos, this.positionLeft + 10, 100)
      this.setPositions(this.positionLeft, newPos)
    }

    if (this.oninput) this.oninput(this.positionLeft, this.positionRight, false)
  }
  onMouseUp() {
    this.remListener()
    if (this.oninput) this.oninput(this.positionLeft, this.positionRight, true)
  }
  setPositions(left, right) {
    this.leftSl.style.left  = `${left}%`
    this.rightSl.style.left = `${right}%`
    this.center.style.left  = `${left}%`
    this.center.style.width = `${right - left}%`
    this.positionLeft = left
    this.positionRight = right
  }

  addListener() {
    document.body.style.userSelect = "none"
    if ('ontouchstart' in document.documentElement) {
      document.addEventListener("touchmove", this.onMouseMove)
      document.addEventListener("touchend", this.onMouseUp)
    } else {
      document.addEventListener("mousemove", this.onMouseMove)
      document.addEventListener("mouseup", this.onMouseUp)
    }

    this.leftInfo.style.display = "flex"
    this.rightInfo.style.display = "flex"

    console.log("listener add");
  }
  remListener() {
    document.body.style.userSelect = null
    document.removeEventListener("mousemove", this.onMouseMove)
    document.removeEventListener("mouseup", this.onMouseUp)
    document.removeEventListener("touchmove", this.onMouseMove)
    document.removeEventListener("touchend", this.onMouseUp)

    this.leftInfo.style.display = null
    this.rightInfo.style.display = null
    this.activedSl = SLIDER_NONE
    console.log("listener rem");
  }
}

class PriceSlider {
  constructor(elem, text, g1, g2) {
    this.gramsMin = g1
    this.gramsMax = g2
    this.minValue = g1
    this.maxValue = g2
    this.gramsDiff = this.gramsMax.subtract(this.gramsMin)
    this.firstInput = true

    this.slider = new Slider(elem, text)
    this.slider.oninput = (left, right, isFinally) => {
      this.minValue = this.gramsMin.add(this.gramsDiff.multiply(new BigInteger(Math.floor(left  * 1000).toString())).divide(new BigInteger("100000")));
      this.maxValue = this.gramsMin.add(this.gramsDiff.multiply(new BigInteger(Math.floor(right * 1000).toString())).divide(new BigInteger("100000")));
      this.slider.leftInfo.innerText = gramsToReadView(this.minValue);
      this.slider.rightInfo.innerText = gramsToReadView(this.maxValue);
      this.firstInput = false
      if (isFinally && this.onchange) this.onchange(this.minValue, this.maxValue);
    }
  }

  setMinValue(g1) {
    this.gramsMin = g1
    if (this.firstInput) this.minValue = g1
    this.gramsDiff = this.gramsMax.subtract(this.gramsMin)

    let newLeft  = (this.minValue.subtract(this.gramsMin).multiply(new BigInteger("100")).divide(this.gramsDiff)).intValue()
    let newRight = (this.maxValue.subtract(this.gramsMin).multiply(new BigInteger("100")).divide(this.gramsDiff)).intValue()

    if (newLeft < 0) {
      this.maxValue = g1
      newLeft = 0
    }

    this.slider.setPositions(newLeft, newRight)
  }
  setMaxValue(g2) {
    this.gramsMax = g2
    if (this.firstInput) this.maxValue = g2
    this.gramsDiff = this.gramsMax.subtract(this.gramsMin)

    let newLeft  = (this.minValue.subtract(this.gramsMin).multiply(new BigInteger("100")).divide(this.gramsDiff)).intValue()
    let newRight = (this.maxValue.subtract(this.gramsMin).multiply(new BigInteger("100")).divide(this.gramsDiff)).intValue()

    if (newRight > 100) {
      this.maxValue = g2
      newRight = 100
    }

    this.slider.setPositions(newLeft, newRight)
  }
}

class FileInput {
  constructor(types, multiple = false) {
    this.input = document.body.createChildren("input", "file-loader")
		this.input.accept = types
		this.input.type = "file"
    this.input.setAttribute("multiple", multiple)
    this.input.style.display = "none"
	}
  onFileRead() {}
  requestFile() {
    this.input.value = "";
    this.input.type = ""
    this.input.type = "file"
    this.input.click();
  }
  set oninput(func) {
    this.input.oninput = func
  }
}

class Button {
  constructor(elem, className, text) {
    this.button = elem.createDiv(className, text)
  }
  set onclick(func) {
    this.button.onclick = func
  }
  set text(text) {
    this.button.innerText = text
  }
}
class DefaultButton extends Button {
  constructor(elem, text, needLoading = false) {
    super(elem, "button", text);

    if (needLoading) this.loadElem = this.button.createChildren("progress", "progress-round")
  }

  set loading (loading) {
    if (this.loadElem)
      this.loadElem.setAttribute("loading", loading)
  }

  get loading() {
    return (this.loadElem.getAttribute("loading") == "true")
  }


}
class LoadFileButton extends Button {
  constructor(elem, text, fileType) {
    super(elem, "input-file-form", "");
    this.inputFile = new FileInput(fileType)
    this.onclick = () => this.inputFile.requestFile()

    this.textElem = this.button.createChildren("p", "", text)
    this.errElem = this.button.createDiv("error-text")
  }

  set oninput(func) {
    this.inputFile.oninput = func
  }
  set text(text) {
    this.textElem.innerText = text
  }
  set errorText(text) {
    this.errElem.innerText = text
  }
}
class MiniButton extends Button {
  constructor(elem, icon) {
    super(elem, "button-mini", "");
    this.button.createChildrenSVG("icon", icon)
  }
}
class MenuButton {
  constructor(elem, icon, buttons) {
    this.openButt = new MiniButton(elem, icon)
    this.openButt.onclick = (event) => {
      console.log(event.target);
      this.buttonsCont.setAttribute("active", true)
    }

    this.buttonsCont = this.openButt.button.createDiv("menu-container")
    this.buttons = []

    for (let buttonParams of buttons) {
      let buttonText = buttonParams[0]
      let buttonClick = buttonParams[1]
      let button = new DefaultButton(this.buttonsCont, buttonText)
      button.onclick = buttonClick
      this.buttons.push(button)
    }

  }
}


class GoToUpButton extends Button {
  constructor() {
    super(document.body, "up-button");

    window.addEventListener('scroll', () => {
      if (window.pageYOffset > 50) this.button.setAttribute("active", true)
      else this.button.removeAttribute("active")
    });

    this.onclick = () => {
      window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
    }

  }
}


document.addEventListener("click", (event) => {
  let needHide = true
  for (let element of event.path)
    if (element.className == "button" || element.className == "button-mini")
      needHide = false

  if (needHide)
    for (let element of document.getElementsByClassName("menu-container"))
      element.removeAttribute("active")

  console.log();
})
