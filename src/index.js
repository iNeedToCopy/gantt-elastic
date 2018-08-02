import { Elastigantt } from './components/Elastigantt.js';
import { Grid } from './components/Grid/Grid.js';
import { GridHeader } from './components/Grid/GridHeader.js';
import { Header } from './components/Header.js';
import { Main } from './components/Main.js';
import { Tree } from './components/Tree/Tree.js';
import { TreeRow } from './components/Tree/TreeRow.js';
import { TreeText } from './components/Tree/Text.js';
import { TreeBar } from './components/Tree/Bar.js';
import { TreeProgressBar } from './components/Tree/ProgressBar.js';
import { Calendar } from './components/Calendar/Calendar.js';
import { CalendarRow } from './components/Calendar/CalendarRow.js';
import { elastiganttStore } from './elastiganttStorage.js';

class ElastiganttApp {
  toPascalCase(str) {
    return str.replace(/(\w)(\w*)/g, function(g0, g1, g2) {
      return g1.toUpperCase() + g2.toLowerCase();
    }).replace(/\-/g, '');
  }

  toKebabCase(str) {
    return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
  }

  getComponents(prefix, kebabCase = true) {
    let self = this;

    let components = {
      'main': Main(prefix, self),
      'tree': Tree(prefix, self),
      'header': Header(prefix, self),
      'grid': Grid(prefix, self),
      'grid-header': GridHeader(prefix, self),
      'tree-row': TreeRow(prefix, self),
      'tree-text': TreeText(prefix, self),
      'tree-bar': TreeBar(prefix, self),
      'tree-progress-bar': TreeProgressBar(prefix, self),
      'calendar': Calendar(prefix, self),
      'calendar-row': CalendarRow(prefix, self),
    };

    let customComponents = {};
    for (let componentName in components) {
      let component = components[componentName];
      // shallow extend
      if (typeof this.customComponents[componentName] !== 'undefined') {
        component = {
          ...component, ...this.customComponents[componentName]
        };
      }
      customComponents[this.toPascalCase(
        prefix + '-' + componentName
      )] = component;
    }

    if (kebabCase) {
      let kebabComponents = {};
      for (let name in customComponents) {
        let value = customComponents[name];
        kebabComponents[this.toKebabCase(name)] = value;
      }
      return kebabComponents;
    }

    return customComponents;
  }

  registerComponents() {
    const components = this.getComponents(this.prefix, true);
    for (let componentName in components) {
      let component = components[componentName]
      let currentInstanceComponentName = componentName;
      Vue.component(currentInstanceComponentName, component);
    }
  }

  wrapComponent(props) {
    return props;
  }

  getDefaultOptions(userOptions) {
    return {
      debug: false,
      width: 0,
      height: 0,
      svgElement: null,
      scope:{
        before:5,
        after:5,
      },
      times: {
        timeScale: 60 * 1000,
        timeZoom: 18,
        timePerPixel: 0,
        fistDate:null,
        firstTime:null, // firstDate getTime()
        lastDate:null,
        lastTime:null, // last date getTime()
        totalViewDurationMs: 0,
        totalViewDurationPx: 0,
        stepMs: 24 * 60 * 60 * 1000,
        stepPx: 0,
        steps: 0,
      },
      row: {
        height: 24,
        style: 'fill:#FF0000a0',
        textStyle: 'fill:#ffffff',
        fontFamily:'sans-serif',
        fontSize: '12px'
      },
      progress:{
        height:6,
        style: 'fill:#00ff92a0',
      },
      horizontalGrid: {
        gap: 6,
        strokeWidth: 1,
        style: "stroke:#00000050;strokeWidth:1",
        lines: [],
      },
      verticalGrid: {
        strokeWidth: 1,
        style: "stroke:#00000050;strokeWidth:1",
        lines: [],
      },
      calendar: {
        hours:[],
        days:[],
        months:[],
        gap:6,
        height: 0,
        strokeWidth:1,
        fontFamily:'sans-serif',
        style:"fill:#00000020;stroke:#00000000;strokeWidth:1",
        hour:{
          height: 20,
          display: true,
          fontSize:'12px',
          format:{
            short(date){
              return dayjs(date).locale('pl').format('HH');
            },
            medium(date){
              return dayjs(date).locale('pl').format('HH:mm');
            },
            long(date){
              return dayjs(date).locale('pl').format('HH:mm');
            }
          }
        },
        day: {
          height: 20,
          display: true,
          fontSize:'12px',
          format:{
            short(date){
              return dayjs(date).locale('pl').format('DD');
            },
            medium(date){
              return dayjs(date).locale('pl').format('DD ddd');
            },
            long(date){
              return dayjs(date).locale('pl').format('DD dddd');
            }
          }
        },
        month:{
          height: 20,
          display: true,
          fontSize:'12px',
          format:{
            short(date){
              return dayjs(date).locale('pl').format('MM');
            },
            medium(date){
              return dayjs(date).locale('pl').format('\'YY MMM');
            },
            long(date){
              return dayjs(date).locale('pl').format('YYYY MMMM (MM)');
            }
          }
        },
      },
      defs:[]
    };
  }

  constructor(prefix, containerId, data, options = {}, customComponents = {}) {
    const self = this;
    if (typeof window.elastiganttStore === 'undefined') {
      window.elastiganttStore = elastiganttStore(
        options.debug,
        options.showStack
      );
    }

    if (containerId.substr(0, 1) === '#') {
      containerId = containerId.substr(1);
    }
    this.containerId = containerId;
    this.containerElement = document.getElementById(containerId);
    this.prefix = prefix.replace(/[^a-z0-9]/gi, '');
    this.prefixPascal = this.toPascalCase(this.prefix);
    dayjs.locale(options.locale, null, true)

    this.data = data;
    this.tasks = data.tasks;
    this.options = Object.assign(this.getDefaultOptions(options), options);

    // initialize observer
    this.tasks = this.tasks.map((task) => {
      task.x = 0;
      task.y = 0;
      task.width = 0;
      task.height = 0;
      return task;
    });

    const globalState = this.options;
    globalState.classInstance = this;
    globalState.data = this.data;
    globalState.tasks = this.tasks;
    this.ctx = document.createElement('canvas').getContext('2d');

    this.customComponents = customComponents;
    this.registerComponents();

    this.app = new Vue({
      el: '#' + containerId,
      template: `<div id="${prefix}-elastigantt">
        <${self.prefix}-main></${self.prefix}-main>
      </div>`,
      data: globalState,
      created() {
        let tasks = this.$root.$data.tasks;
        let firstTaskTime = Number.MAX_SAFE_INTEGER;
        let lastTaskTime = 0;
        let firstTaskDate,lastTaskDate;
        for (let index = 0, len = this.tasks.length; index < len; index++) {
          let task = this.tasks[index];
          task.startDate = new Date(task.start);
          task.startTime = task.startDate.getTime();
          task.durationMs = task.duration * 1000;
          if (task.startTime < firstTaskTime) {
            firstTaskTime = task.startTime;
            firstTaskDate = task.startDate;
          }
          if (task.startTime + task.durationMs > lastTaskTime) {
            lastTaskTime = task.startTime + task.durationMs;
            lastTaskDate = new Date(task.startTime + task.durationMs);
          }
        }
        this.times.firstTaskTime = firstTaskTime;
        this.times.lastTaskTime = lastTaskTime;
        this.times.firstTaskDate = firstTaskDate;
        this.times.lastTaskDate = lastTaskDate;
        this.recalculate();
      },
      methods: {
        calculateCalendarDimensions(){
          this.calendar.height = 0;
          if(this.calendar.hour.display){
            this.calendar.height+=this.calendar.hour.height;
          }
          if(this.calendar.day.display){
            this.calendar.height+=this.calendar.day.height;
          }
          if(this.calendar.month.display){
            this.calendar.height+=this.calendar.month.height;
          }
        },
        recalculate() {
          const firstDate = this.times.firstTaskDate.toISOString().split('T')[0]+'T00:00:00';
          const lastDate = this.times.lastTaskDate.toISOString().split('T')[0]+'T23:59:59.999';
          this.times.firstDate = dayjs(firstDate).locale(this.locale).subtract(this.scope.before,'days').toDate();
          this.times.lastDate = dayjs(lastDate).locale(this.locale).add(this.scope.after,'days').toDate();
          this.times.firstTime = this.times.firstDate.getTime();
          this.times.lastTime = this.times.lastDate.getTime();
          this.times.totalViewDurationMs = this.times.lastDate.getTime() - this.times.firstDate.getTime();

          let max = this.times.timeScale * 60;
          let min = this.times.timeScale;
          let steps = max / min;
          let percent = (this.times.timeZoom / 100);
          this.times.timePerPixel = this.times.timeScale * steps * percent + Math.pow(2, this.times.timeZoom);
          this.times.totalViewDurationPx = this.times.totalViewDurationMs / this.times.timePerPixel;
          this.times.stepPx = this.times.stepMs / this.times.timePerPixel;
          this.times.steps = Math.ceil(this.times.totalViewDurationPx / this.times.stepPx);

          let widthMs = this.times.lastTime - this.times.firstTime;
          let width = 0;
          if (widthMs) {
            width = widthMs / this.times.timePerPixel;
          }
          this.width = width + this.verticalGrid.strokeWidth;
          this.calculateCalendarDimensions();
          this.height = this.tasks.length * (this.row.height + this.horizontalGrid.gap*2) + this.horizontalGrid.gap + this.calendar.height+this.$root.$data.calendar.strokeWidth+ this.$root.$data.calendar.gap;
          for (let index = 0, len = this.tasks.length; index < len; index++) {
            let task = this.tasks[index];
            task.width = task.durationMs / this.times.timePerPixel - this.verticalGrid.strokeWidth;
            if(task.width < 0){
              task.width = 0;
            }
            task.height = this.row.height;
            let x = task.startTime - this.times.firstTime;
            if (x) {
              x = x / this.times.timePerPixel;
            }
            task.x = x + this.verticalGrid.strokeWidth;
            task.y = ((this.row.height + this.horizontalGrid.gap*2) * index) + this.horizontalGrid.gap + this.calendar.height+this.$root.$data.calendar.strokeWidth+ this.$root.$data.calendar.gap;
          }
        },
        getSVG() {
          return this.svgElement.outerHTML;
        },
        getImage(type = 'image/png') {
          return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
              const canvas = document.createElement('canvas');
              canvas.width = this.svgElement.clientWidth;
              canvas.height = this.svgElement.clientHeight;
              canvas.getContext('2d').drawImage(img, 0, 0);
              resolve(canvas.toDataURL(type));
            }
            img.src = "data:image/svg+xml," + encodeURIComponent(this.getSVG());
          });
        }
      }
    });
  }
}
export { ElastiganttApp };
window.ElastiganttApp = ElastiganttApp;
