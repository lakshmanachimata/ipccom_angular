const fs = require("fs")
const path = require("path")

const root = process.cwd();
const TARGETFOLDER = path.resolve(root, 'etp-ipchost')
const SRCCONFIGFOLDER = path.resolve(root, 'configuration')
const TARTCONFIGFOLDER = path.resolve(TARGETFOLDER, 'configuration')

const packagify = () => {
  copyConfiguration().
   then(done => {

   }).then(pkgs => {

   }).then(done => {

   }).then(done => done ? console.log('packagify completed successfully') : console.log('packagify failed'))
   .catch(error => console.log(`An error occured with in packagify : ${error}`))
}

const copyConfiguration = () => {
  console.log('with in copyConfiguration')
  const fsPlus = require('fs-extra')
  return new Promise((resolve, reject ) => {
    const targetFolderExists = fs.existsSync(TARGETFOLDER)
    const srcConfigFolderExists = fs.existsSync(SRCCONFIGFOLDER)
    if(targetFolderExists && srcConfigFolderExists) {
      if(!fs.existsSync(TARTCONFIGFOLDER) && fs.mkdirSync(TARTCONFIGFOLDER)) {
        fsPlus.copy(SRCCONFIGFOLDER,TARTCONFIGFOLDER, (error) => {
          if(error) {
            reject(`An error occured while copying configuration folder Error : ${error}` )
          }else {
            console.log('configuration completed')
            resolve()
          }
        })
      }
    }else{
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
      resolve(`flattenProdDependency Completed! Packages: ${pkgs}`)
      resolve(pkgs)
    }else {
      reject(new Error("flattenProdDependency failed. No dependencies were copied"))
    }
  })
}
