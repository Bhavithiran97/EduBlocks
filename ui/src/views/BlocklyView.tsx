import React = require('preact');
import { Component } from 'preact';
import { getToolBoxXml } from '../blocks';
import { Extension } from '../types';
import _ = require('lodash');

/// <reference path="screenshot.d.ts" />

interface BlocklyViewProps {
  visible: boolean;
  xml: string | null;
  extensionsActive: Extension[];

  onChange(xml: string, python: string): void;
}

export default class BlocklyView extends Component<BlocklyViewProps, {}> {
  private blocklyDiv?: Element;
  private workspace?: Blockly.WorkspaceSvg;
  private xml: string | null = null;

  public async componentWillReceiveProps(nextProps: BlocklyViewProps) {
    if (nextProps.visible) {

      // Reload blockly if the extensions have changed
      if (!_.isEqual(this.props.extensionsActive, nextProps.extensionsActive)) {
        this.loadBlockly(nextProps.extensionsActive);
      }
    }

    if (this.props.visible) { 
      if (this.xml !== nextProps.xml) {
        try{await this.setXml(nextProps.xml);}
        catch(e){}
      }
    }
  }

  public async componentDidMount() {
    this.loadBlockly(this.props.extensionsActive);
  }

  private async loadBlockly(extensionsActive: Extension[]) {
    if (this.blocklyDiv) {
      // Kill the old workspace if it's already there...
      if (this.workspace) {
        this.workspace.dispose();
      }
      const toolbox = await getToolBoxXml(extensionsActive);


      this.workspace = Blockly.inject(this.blocklyDiv, {

        zoom:
        {
          controls: true,
          wheel: true,
          startScale: 1.0,
          maxScale: 3,
          minScale: 0.3,
          scaleSpeed: 1.2,
        },

        grid: {
          spacing: 30,
          length: 7,
          colour: "rgba(189, 195, 199, 0.52)",
          snap: false
        },

        
        media: 'blockly/media/',
        collapse: false,
        renderer: "pxt",
        
        
        toolbox,
      }) as Blockly.WorkspaceSvg;

      await this.workspace.addChangeListener(() => {
        const xml = this.getXml();

        const python = this.getPython();

        this.xml = xml;

        if (!this.workspace!.isDragging()) {
          this.props.onChange(xml, python);
        }
      });

      Blockly.svgResize(this.workspace);

      this.workspace.configureContextMenu = this.customContextMenuFn;

      // disable blocks that aren't attached to the start block
      this.workspace.addChangeListener(Blockly.Events.disableOrphans);
      
      Blockly.Generator.prototype.INDENT = '\t';

      try{this.setXml(this.xml);}
      catch(e){}
    }
  }

  private customContextMenuFn(options: any) {
    var option = {
      enabled: true,
      text: "Download Screenshot",
      callback: function() {
        exportPNG()
      }
    };
    options.push(option);
  }

  private getXml(): string {
    if (!this.workspace) {
      throw new Error('No workspace!');
    }

    const xml = Blockly.Xml.workspaceToDom(this.workspace);

    return Blockly.Xml.domToPrettyText(xml);
  }

  private getPython(): string {
    if (!this.workspace) {
      throw new Error('No workspace!');
    }

    return Blockly.Python.workspaceToCode(this.workspace);
  }

  private setXml(xml: string | null) {

    if (!this.workspace) {
      throw new Error('No workspace!');
    }

    this.workspace.clear();

    // console.log("in setXML")
    
    var start = null;
    var new_xml = '<xml xmlns="https://developers.google.com/blockly/xml"><block type="events_start_here" id="DI_start_here" x="'+ 100 + '" y="43" deletable="false" movable="false"></block></xml>';

    if (typeof xml === 'string') {
      // check if we have a top hat
      start = xml.search("DI_start_here");

      if (start < 0) {
        // console.log("top hat not found")
        var first_block_position = xml.search("<block")
        var start_block_xml = '<block type="events_start_here" id="DI_start_here" x="'+ 100 + '" y="43" deletable="false" movable="false">'

        if (first_block_position < 0)
        // no block were found, we have an empty XML coming in 
        {   
          console.log("no blocks were found")
          // new_xml will be used as is
        } else {
          // insert new top hat in the XML code
          var pos_from_end_of_string = -1 * ("</xml>".length)
          var new_xml = xml.slice(0, first_block_position) + start_block_xml + "<next>" + xml.slice(first_block_position, pos_from_end_of_string) + "</next></block>" + xml.slice(pos_from_end_of_string);
        }
        const textToDom = Blockly.Xml.textToDom(new_xml);
        Blockly.Xml.domToWorkspace(textToDom, this.workspace);

      } else {
        // top hat found
        // do not use new_xml, but use the provided xml as is
        const textToDom = Blockly.Xml.textToDom(xml);
        Blockly.Xml.domToWorkspace(textToDom, this.workspace);
      }
    }
    else {
      // opening a new file
      const textToDom = Blockly.Xml.textToDom(new_xml);
      Blockly.Xml.domToWorkspace(textToDom, this.workspace);
    }
  }

  public render() {
    return (
      <div
        style="display: block"
        id='blockly'
        ref={(div) => this.blocklyDiv = div}>
      </div>
    );
  }
}