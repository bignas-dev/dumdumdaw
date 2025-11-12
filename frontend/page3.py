from nicegui import ui
import time

def include_static_assets(js_files=None, css_files=None):
    """Adds given JS and CSS files to the current NiceGUI page with version cache-busting."""
    js_files = js_files or []
    css_files = css_files or []
    version = int(time.time())
    for css in css_files:
        ui.add_head_html(f'<link rel="stylesheet" href="/static/{css}?v={version}">')
    for js in js_files:
        ui.add_body_html(f'<script src="/static/{js}?v={version}"></script>')

@ui.page("/page3")
def page3():
    include_static_assets(js_files=[], css_files=[])

    page3_head_html = ui.add_head_html('''
    <style>
   .main-content {
    background-color: #344966; 
    min-height: 100vh;
    padding-top: 120px;                              
    }
                                       
    .header-content {
    background-color: #E6AACE;
    padding: 7px;
    width: 85vw;
    align-items: center;
    margin: auto;
    border-radius: 10px;
    display: flex;
    flex-direction: row;
    flex: 1;
    justify-content: space-between;  
    position: relative;                
    }
                                       
    .navigation-link {
    display: flex;
    flex-direction: row;
    gap: 30px;
    font-size: 20px;
    }
                                       
    h5 {
    margin-left: 110px;
    font-size: 34px;
    }
    
    .text-block {
    font-weight: 500;
    font-size: 80px;
    padding-left: 10px;                        
    }
                                       
    .smalltext-block {
    font-weight: 420;
    font-size: 30px;
    text-align: left;
    margin: 0;
    padding-left: 20px;                                   
    line-height: 1.4;
    letter-spacing: 2px;
    margin-top: 10px;                        
    }
                                       
    .logo {
    position: absolute;
    left: -10px;
    top: -190%;
                                                        
    }

    .left-block {
    background-color: #E6AACE;
    border-radius: 7px;
    display: flex;
    flex-direction: column;
    min-height: 10vh;
    width: 35vw;
    position: relative;
    margin-left: 50px;
    padding-top: 20px;
    padding-bottom: 10px;
    }

    .content-block {
    margin: auto;
    padding: 20px;
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;
    gap: 70px;                             
    } 

    .mygtukas {
    position: absolute;
    width: 220px;
    height: 80px;
    border-radius: 60px;
    background-color: black;
    right: -10%;
    top: 90%;
    color: white; 
    font-size: 30px;
    font-weight: 600;
    align-items: center;
    justify-content: center;
    display: flex;                                                              
    }                                      
    
    </style>
    ''')

    page3_body_html = ui.add_body_html("""
        <div class="main-content">
  <div class="header-content">
    <div class="navigation-link">
      <img class="logo" src="static/logo.svg" />
      <h5>DumDumDaw</h5>
    </div>
    <div class="navigation-link">
      <a>About</a>
      <a>Guide</a>
      <a>Projects</a>
    </div>
  </div>
  <div class="content-block">
    <div class="left-block"><h1 class="text-block">The Best DAW For Dumdums!</h1> <h5 class="smalltext-block">Make simple MIDI beats, <br> all in an easy-to-use <br> interface.</h5><a href="/" class="mygtukas">Open Builder</a></div>
  
    <div><img class="logo-screen" src="static/screen.png"/></div>
    <div></div>
  </div>
</div>
    """)
