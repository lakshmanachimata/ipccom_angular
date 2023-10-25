const fs = require("fs");
const path = require("path");

const root = process.cwd();
const TARGETFOLDER = path.resolve(root, 'etp-ipchost');
const SRCCONFIGFOLDER = path.resolve(root, 'configuration');
const TARGETTCONFIGFOLDER = path.resolve(TARGETFOLDER, 'configuration');

const packagify = () => {
  copyConfiguration().
   then(done => {
      const reject = () =>  Promise.reject(new Error("Configuration folder creation failed"))
      return done ? flattenProdDependency() : reject();
   }).then(pkgs => {
      return prodDependencyResolver(pkgs)
   }).then(done => {
    const reject = () =>  Promise.reject(new Error("Production dependency package copy failed"))
    return done ? cleanup() : reject();
   }).then(done => done ? console.log('packagify completed successfully!!!') : console.log('packagify failed'))
   .catch(error => console.log(`An error occurred with in packagify : ${error}`))
};

const copyConfiguration = () => {
  console.log('with in copyConfiguration');
  const fsPlus = require('fs-extra');
  return new Promise((resolve, reject ) => {
    const targetFolderExists = fs.existsSync(TARGETFOLDER)
    const srcConfigFolderExists = fs.existsSync(SRCCONFIGFOLDER)
    if(targetFolderExists && srcConfigFolderExists) {
      if(!fs.existsSync(TARGETTCONFIGFOLDER) )
        fs.mkdirSync(TARGETTCONFIGFOLDER)
        fsPlus.copy(SRCCONFIGFOLDER,TARGETTCONFIGFOLDER, (error) => {
          if(error){
            console.log('with in copyConfiguration2');
            reject(`An error occured while copying configuration folder Error : ${error}` )
          }
          else {
            console.log('copyConfiguration completed!');
            resolve(true)
          };
        });
        console.log('with in copyConfiguration3');
      } else{
        reject(new Error('copyConfiguration failed'))
      }
    })
  }


const flattenProdDependency = () => {
  console.log('with in flattenProdDependency')
  return new Promise((resolve, reject ) => {
    const dependencies = require('../package.json').dependencies
    let pkgs = ''
    if( dependencies != null && dependencies != undefined && dependencies instanceof Object) {
      Object.keys(dependencies).forEach(key => {
        pkgs += ` ${key}@${dependencies[key]}`
      })
    }
    if(pkgs.length) {
      console.log(`flattenProdDependency Completed! Packages: ${pkgs}`)
      resolve(pkgs)
    }else {
      reject(new Error("flattenProdDependency failed. No dependencies were copied"))
    }
  })
}

const prodDependencyResolver = (packages) => {
  console.log('with in prodDependencyResolver')
  if( packages != undefined && packages != null && packages.length > 0 && typeof packages === "string") {
    console.log("packages are " + packages)
    const cp = require('child_process')
    return new Promise((resolve, reject )=> {
      const installCmd = `npm install --prefix ${TARGETFOLDER}`;
      const npmRunChild = cp.spawn('npm', ['install', '--prefix', TARGETFOLDER, packages], {
        shell : true
      });
      //capture child exit event
      npmRunChild.on('exit', (code, signal) => {
        if(code) {
          reject(`child process existed with code ${code} and signal ${signal}`)
        }else{
          console.log('prodDependencyResolver completed!')
          resolve(true)
        }
      })
      //listen for any errors from child
      npmRunChild.on('error', (error) => {
        reject(new Error(`child process failed with error ${error}`))
      })
      //listen to the output from child process
      npmRunChild.stdout.on('data', (data) => {
        console.log(`Data from child streams stdout : ${data}`)
      })
      //listen to any errors from child process
      npmRunChild.stderr.on('data', (data) => {
        console.log(`Data from child streams stderr : ${data}`)
      })
    })
  }
}

const cleanup = () => {
  console.log('with in cleanup')
  const folders = []; //etc
  return new Promise((resolve,reject) => {
    folders.forEach(folder => fs.rmdirSync(path.resolve(TARGETFOLDER,folder)))
    console.log('cleanup completed!')
    resolve(true)
  })
}
packagify();
