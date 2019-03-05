//todo:
// - effect lingers if you don't move cursor for a while

const throttle = require('lodash.throttle');

const CURSOR_START_POS = 42; //the x position of the cursor starting point
const MAX_PARTICLES = 300;
const PARTICLE_THRESHOLD = 0.05;
const PARTICLE_ALPHA_FADEOUT_RATE = 0.9;

var COLOUR_POINTER = 0;
const COLOURS = [
  'rgb(28,185,248)',
  'rgb(80,224,209)',
  'rgb(245,191,95)',
  'rgb(253,106,125)',
  'rgb(127,85,135)',
  'rgb(26,103,133)'
];

// rgb(r, g, b) => rgba(r, g, b, a)
const RBGToRBGA = (rbg, alpha) => rbg.replace(')', `, ${alpha})`).replace('rgb', 'rgba');

// used to track the previous x position of the cursor
var CURSOR_PREV_POS;

module.exports.decorateTerm = (Term, {React, notify}) => {
  return class extends React.Component {
    constructor (props, context) {
      super(props, context);
      this._drawFrame = this._drawFrame.bind(this);
      this._resizeCanvas = this._resizeCanvas.bind(this);
      this._onCursorMove = this._onCursorMove.bind(this);
      this._onDecorated = this._onDecorated.bind(this);
      this._createAfterEffect = throttle(this._createAfterEffect.bind(this), 25, { trailing: false });

      // the effects
      this._particles = [];

      //initialise previous cursor position to starting point
      CURSOR_PREV_POS = CURSOR_START_POS;
    }

    _onDecorated (term) {
      if (this.props.onDecorated) this.props.onDecorated(term);
      this._div = term.termRef;
      this._initCanvas();
    }

    // Set up our canvas element we'll use to do particle effects on.
    _initCanvas() {
      this._canvas = document.createElement('canvas');
      this._canvas.style.position = 'absolute';
      this._canvas.style.top = '0';
      this._canvas.style.pointerEvents = 'none';
      this._canvasContext = this._canvas.getContext('2d');
      this._canvas.width = window.innerWidth;
      this._canvas.height = window.innerHeight;
      document.body.appendChild(this._canvas);
      window.requestAnimationFrame(this._drawFrame);
      window.addEventListener('resize', this._resizeCanvas);
    }


    // goes through particles array
    _drawFrame() {
      this._particles.length && this._canvasContext.clearRect(0, 0, this._canvas.width, this._canvas.height);
      this._particles.forEach((particle) => {
        particle.alpha *= PARTICLE_ALPHA_FADEOUT_RATE;
        this._canvasContext.fillStyle = RBGToRBGA(particle.colour, particle.alpha);
        this._canvasContext.fillRect(Math.round(particle.x - particle.width), Math.round(particle.y), particle.width, particle.height);

        //if particle alpha is below the threshold hide it completely - need to redraw this somehow
        // if(particle.alpha < PARTICLE_THRESHOLD){
        //   particle.alpha = 0;
        // }
      })
      this._particles = this._particles
        .slice(Math.max(this._particles.length - MAX_PARTICLES, 0))
        .filter((particle) => particle.alpha > PARTICLE_THRESHOLD); //stops alpha dropping when it reaches below PARTICLE_THRESHOLD else it goes on inf
      window.requestAnimationFrame(this._drawFrame);
    }

    _onCursorMove (cursorFrame) {
      if (this.props.onCursorMove) this.props.onCursorMove(cursorFrame);

      const { x, y, width, height} = cursorFrame;
      const origin = this._div.getBoundingClientRect();

      // will not draw effects until the cursor is at or after the starting position
      if(x >= CURSOR_START_POS){
        // if backspace
        if(x < CURSOR_PREV_POS){
          requestAnimationFrame(() => {
            this._createAfterEffect(
              x + origin.left + width,
              y + origin.top,
              width,
              height
            );
          })
        }
        // if space
        else if (x > CURSOR_START_POS){
          requestAnimationFrame(() => {
            this._createAfterEffect(
              x + origin.left,
              y + origin.top,
              width,
              height
            );
          })
        }
    }

    CURSOR_PREV_POS = x;
  }

    nextColour(){
      if(COLOUR_POINTER < COLOURS.length - 1){
        COLOUR_POINTER = COLOUR_POINTER + 1
      } else {
        COLOUR_POINTER = 0
      }

      return COLOURS[COLOUR_POINTER]
    }

    // creates and pushes effects to the array
    _createAfterEffect(x, y, width, height) {

      //move the pointer to the next colour
      if(COLOUR_POINTER < COLOURS.length - 1){
        COLOUR_POINTER = COLOUR_POINTER + 1
      } else {
        COLOUR_POINTER = 0
      }

      const colour = COLOURS[COLOUR_POINTER]

      this._particles.push({
        x: x,
        y: y,
        width: width,
        height: height,
        alpha: 1,
        colour: colour
      })
    }

    render() {
      return React.createElement(Term, Object.assign({}, this.props, {
        onDecorated: this._onDecorated,
        onCursorMove: this._onCursorMove
      }))
    }

    _resizeCanvas() {
      this._canvas.width = window.innerWidth;
      this._canvas.height = window.innerHeight;
    }

    componentWillUnmount() {
      document.body.removeChild(this._canvas);
    }
  }
}
