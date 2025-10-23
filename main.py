from nicegui import ui

ui.add_head_html('''
<header>
         <h1>DumDumDaw</h1>        
</header>
<style>
                 body {
                    background-color: #344966;
                 }
                 header {
                    background-color: #e6aace;
                    color: #0d1821;
                    margin: auto;
                    margin-top: 50px;
                    width: 1080px;
                    padding-left: 100px;
                    border-radius: 15px;

                 }
                 h1 {
                    font-family: "Century Gothic";
                    font-size: 40px;
                    font-weight: 550;

                 }
</style>

''')
ui.label(".")

ui.run()