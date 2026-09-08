/* ============================================================
   teacherData.js — VTA ICT Level 5 curriculum for the AI Teacher
   Subject → Lesson → Concepts. The concept notes ground E.J.AI on
   the correct ICT L5 material and act as a safe fallback if the
   model is unavailable. Pure data — no dependencies.

   Curriculum basis: study material organised around ICT Level 5
   competency areas. This file does not assert VTA/TVEC unit codes,
   credit values or official assessment requirements.

   Backward-compatible shape (older code reads only name/note):
     subject { id, name, icon, blurb, lessons[] }
     lesson  { id, title, summary, difficulty?, objectives?[],
               prerequisites?[], concepts[] }
     concept { name, note, mistake? }
   ============================================================ */
const teacherData = {
  standard: null,
  supplemental: true,
  subjects: [
    {
      id: "programming",
      name: "Software Programming",
      icon: "💻",
      blurb: "Core programming logic, from variables to object-oriented design.",
      lessons: [
        {
          id: "prog-fundamentals",
          title: "Programming Fundamentals",
          summary: "The building blocks every program is made of.",
          difficulty: 1,
          objectives: ["Identify variables and common data types", "Use arithmetic, relational and logical operators", "Handle input/output and write clear, correct syntax"],
          prerequisites: [],
          concepts: [
            { name: "Variables & Data Types", note: "A variable is a named store for a value; common types are integer, float, char, string and boolean.", mistake: "Confusing the number 5 with the text \"5\", or assuming a value's type never matters." },
            { name: "Operators", note: "Arithmetic (+ - * / %), relational (< > == !=) and logical (AND OR NOT) operators combine and compare values.", mistake: "Using = (assignment) where == (comparison) is meant, and misreading operator precedence." },
            { name: "Input & Output", note: "Programs read input from the user/keyboard and write output to the screen.", mistake: "Forgetting that input often arrives as text and must be converted before doing arithmetic." },
            { name: "Comments & Syntax", note: "Comments explain code and are ignored by the compiler; syntax is the grammar rules of the language.", mistake: "Thinking comments change how code runs, or ignoring exact syntax like semicolons and brackets." }
          ]
        },
        {
          id: "prog-control",
          title: "Control Structures",
          summary: "Making decisions and repeating actions.",
          difficulty: 2,
          objectives: ["Choose the right conditional for a decision", "Select and write count- and condition-controlled loops", "Combine conditions and loops to model logic"],
          prerequisites: ["prog-fundamentals"],
          concepts: [
            { name: "Conditional Statements", note: "if, if-else and switch let a program choose different paths based on a condition.", mistake: "Chaining if instead of else-if so more than one branch runs, or forgetting break in a switch." },
            { name: "Loops", note: "for, while and do-while repeat a block of code; for is count-controlled, while is condition-controlled.", mistake: "Writing a loop whose condition never becomes false, causing an infinite loop." },
            { name: "Loop Control", note: "break exits a loop early; continue skips to the next iteration.", mistake: "Confusing break (leave the loop) with continue (skip to the next pass)." },
            { name: "Nested Structures", note: "Conditions and loops can be placed inside one another to model complex logic.", mistake: "Losing track of which loop a break/continue affects, or wrong indentation hiding the real nesting." }
          ]
        },
        {
          id: "prog-functions",
          title: "Functions & Modularity",
          summary: "Breaking a program into reusable pieces.",
          difficulty: 2,
          objectives: ["Define and call reusable functions", "Pass parameters and return values", "Reason about variable scope and recursion"],
          prerequisites: ["prog-control"],
          concepts: [
            { name: "Defining Functions", note: "A function is a named, reusable block of code that performs one task.", mistake: "Confusing defining a function with calling it, so the code is written but never runs." },
            { name: "Parameters & Return", note: "Parameters pass data into a function; the return statement sends a result back.", mistake: "Printing a value instead of returning it, or forgetting that return ends the function." },
            { name: "Variable Scope", note: "Local variables exist only inside their function; global variables are visible everywhere.", mistake: "Expecting a local variable to be visible outside its function, or overusing globals." },
            { name: "Recursion", note: "A recursive function calls itself, with a base case that stops the recursion.", mistake: "Leaving out the base case (or never reaching it), causing infinite recursion." }
          ]
        },
        {
          id: "prog-arrays",
          title: "Arrays & Strings",
          summary: "Working with collections of data.",
          difficulty: 3,
          objectives: ["Store and access data in arrays by index", "Traverse arrays with loops", "Perform common string operations"],
          prerequisites: ["prog-functions"],
          concepts: [
            { name: "Arrays", note: "An array stores many values of the same type under one name, accessed by index.", mistake: "Mixing up the array's length with its highest valid index." },
            { name: "Indexing", note: "Array indexes usually start at 0; the last index is length minus one.", mistake: "Off-by-one errors — using index length instead of length-1 and going out of bounds." },
            { name: "Iteration", note: "Loops are used to traverse and process every element of an array.", mistake: "Starting or ending the loop at the wrong index and skipping the first or last element." },
            { name: "String Operations", note: "Strings are sequences of characters supporting length, concatenation and substring operations.", mistake: "Assuming strings are numbers, or forgetting string indexes also start at 0." }
          ]
        },
        {
          id: "prog-oop",
          title: "Object-Oriented Programming",
          summary: "Modelling the world with objects.",
          difficulty: 3,
          objectives: ["Distinguish classes from objects", "Explain encapsulation and inheritance", "Recognise polymorphism in use"],
          prerequisites: ["prog-arrays"],
          concepts: [
            { name: "Classes & Objects", note: "A class is a blueprint; an object is an instance created from that blueprint.", mistake: "Treating the class and the object as the same thing rather than blueprint versus instance." },
            { name: "Encapsulation", note: "Bundling data and methods together and hiding internal detail behind access modifiers.", mistake: "Making all fields public, which defeats the purpose of hiding internal detail." },
            { name: "Inheritance", note: "A child class reuses and extends the members of a parent class.", mistake: "Using inheritance for unrelated classes instead of a genuine is-a relationship." },
            { name: "Polymorphism", note: "The same method call behaves differently depending on the object's actual type.", mistake: "Expecting the variable's declared type, not the object's actual type, to decide which method runs." }
          ]
        }
      ]
    },
    {
      id: "database",
      name: "Database Systems",
      icon: "🗄️",
      blurb: "Designing, modelling and querying relational databases.",
      lessons: [
        {
          id: "db-concepts",
          title: "Database Concepts",
          summary: "Why databases beat plain files.",
          difficulty: 1,
          objectives: ["Distinguish data from information", "Explain what a DBMS does", "State the advantages of a DBMS and the main user roles"],
          prerequisites: [],
          concepts: [
            { name: "Data vs Information", note: "Data are raw facts; information is processed, meaningful data.", mistake: "Using 'data' and 'information' as if they mean the same thing." },
            { name: "DBMS", note: "A Database Management System is software that stores, manages and controls access to data.", mistake: "Confusing the DBMS software (e.g. MySQL) with the database (the actual stored data)." },
            { name: "Advantages of a DBMS", note: "Reduced redundancy, data consistency, sharing, security and integrity over file-based systems.", mistake: "Believing a DBMS removes all redundancy entirely rather than controlling it." },
            { name: "Database Users", note: "Roles include the database administrator (DBA), application programmers and end users.", mistake: "Assuming every user needs full DBA rights to the database." }
          ]
        },
        {
          id: "db-relational",
          title: "The Relational Model",
          summary: "Tables, rows, columns and keys.",
          difficulty: 2,
          objectives: ["Describe relations, tuples and attributes", "Choose primary and foreign keys", "Tell candidate and composite keys apart"],
          prerequisites: ["db-concepts"],
          concepts: [
            { name: "Relations & Attributes", note: "A relation is a table; rows are tuples/records and columns are attributes/fields.", mistake: "Swapping the terms — calling a column a record or a row an attribute." },
            { name: "Primary Key", note: "A primary key uniquely identifies each row and cannot be null.", mistake: "Choosing a column that can repeat or be empty as the primary key." },
            { name: "Foreign Key", note: "A foreign key references a primary key in another table to link them.", mistake: "Thinking the foreign key lives in the parent table rather than the referencing table." },
            { name: "Candidate & Composite Keys", note: "A candidate key can serve as primary key; a composite key uses two or more columns.", mistake: "Assuming a composite key means two separate primary keys instead of one key over several columns." }
          ]
        },
        {
          id: "db-normalization",
          title: "Normalization",
          summary: "Removing redundancy step by step.",
          difficulty: 3,
          objectives: ["Recognise redundancy and update anomalies", "Apply 1NF, 2NF and 3NF", "Explain why normalization helps integrity"],
          prerequisites: ["db-relational"],
          concepts: [
            { name: "Redundancy & Anomalies", note: "Duplicated data causes insert, update and delete anomalies.", mistake: "Seeing repeated data as harmless rather than a source of update anomalies." },
            { name: "First Normal Form (1NF)", note: "Each cell holds a single atomic value with no repeating groups.", mistake: "Leaving comma-separated lists in one cell and calling it 1NF." },
            { name: "Second Normal Form (2NF)", note: "1NF plus no partial dependency of non-key attributes on part of a composite key.", mistake: "Checking 2NF even when there is no composite key, where it cannot be violated." },
            { name: "Third Normal Form (3NF)", note: "2NF plus no transitive dependency between non-key attributes.", mistake: "Missing a transitive dependency where one non-key column determines another." }
          ]
        },
        {
          id: "db-sql",
          title: "SQL Basics",
          summary: "The language for talking to databases.",
          difficulty: 2,
          objectives: ["Separate DDL from DML", "Write SELECT queries with WHERE", "Insert, update, delete and join data"],
          prerequisites: ["db-relational"],
          concepts: [
            { name: "DDL vs DML", note: "DDL defines structure (CREATE, ALTER, DROP); DML manipulates data (SELECT, INSERT, UPDATE, DELETE).", mistake: "Grouping DROP (DDL) with DELETE (DML) as if they do the same job." },
            { name: "SELECT & WHERE", note: "SELECT retrieves columns; WHERE filters rows by a condition.", mistake: "Using = with NULL instead of IS NULL, or confusing WHERE with HAVING." },
            { name: "INSERT, UPDATE, DELETE", note: "These add new rows, change existing rows and remove rows.", mistake: "Running UPDATE or DELETE with no WHERE clause and changing every row." },
            { name: "JOIN", note: "A JOIN combines rows from two or more tables using a related key.", mistake: "Forgetting the join condition and producing a huge cross join." }
          ]
        },
        {
          id: "db-er",
          title: "ER Modeling",
          summary: "Designing a database before you build it.",
          difficulty: 3,
          objectives: ["Identify entities and attributes", "Describe relationships and cardinality", "Map an ER diagram to tables"],
          prerequisites: ["db-relational"],
          concepts: [
            { name: "Entities & Attributes", note: "An entity is a real-world thing; attributes are its properties.", mistake: "Modelling an attribute (like 'address') as its own entity without reason, or vice versa." },
            { name: "Relationships", note: "Relationships link entities, such as a Student enrolls in a Course.", mistake: "Confusing an entity with a relationship, or missing that a relationship can carry attributes." },
            { name: "Cardinality", note: "Cardinality describes one-to-one, one-to-many and many-to-many links.", mistake: "Reading the cardinality the wrong way round between the two entities." },
            { name: "Mapping ER to Tables", note: "Entities become tables and relationships become foreign keys or link tables.", mistake: "Trying to store a many-to-many link with a single foreign key instead of a link table." }
          ]
        }
      ]
    },
    {
      id: "networking",
      name: "Networking",
      icon: "🌐",
      blurb: "How computers connect, address each other and communicate.",
      lessons: [
        {
          id: "net-fundamentals",
          title: "Networking Fundamentals",
          summary: "What a network is and why we build them.",
          difficulty: 1,
          objectives: ["Define a network and its benefits", "Compare LAN, WAN and MAN", "Recognise common topologies"],
          prerequisites: [],
          concepts: [
            { name: "What is a Network", note: "A network is two or more devices connected to share data and resources.", mistake: "Thinking a network needs the internet, when two linked computers already form one." },
            { name: "Network Types", note: "LAN covers a small area, WAN spans large distances, MAN covers a city.", mistake: "Calling any large network a LAN, or confusing coverage area with speed." },
            { name: "Topologies", note: "Physical layouts include bus, star, ring and mesh.", mistake: "Mixing up physical topology (the wiring) with logical topology (how data flows)." },
            { name: "Benefits of Networking", note: "Resource sharing, communication, centralised data and cost savings.", mistake: "Overlooking the added cost and security risk that networking also introduces." }
          ]
        },
        {
          id: "net-osi",
          title: "The OSI Model",
          summary: "A seven-layer map of communication.",
          difficulty: 2,
          objectives: ["State the purpose of the OSI model", "Name the seven layers in order", "Explain encapsulation across layers"],
          prerequisites: ["net-fundamentals"],
          concepts: [
            { name: "Purpose of OSI", note: "The OSI model is a 7-layer reference framework that standardises network communication.", mistake: "Treating OSI as software that runs, rather than a reference model for understanding." },
            { name: "The Seven Layers", note: "Physical, Data Link, Network, Transport, Session, Presentation, Application.", mistake: "Listing the layers out of order or merging Session and Presentation." },
            { name: "Layer Roles", note: "Lower layers move bits and frames; upper layers handle sessions and applications.", mistake: "Placing routing at the Transport layer instead of the Network layer." },
            { name: "Encapsulation", note: "Each layer wraps data with its own header as it travels down the stack.", mistake: "Thinking data shrinks going down the stack, when each layer adds a header." }
          ]
        },
        {
          id: "net-tcpip",
          title: "TCP/IP & Protocols",
          summary: "The rules that run the internet.",
          difficulty: 2,
          objectives: ["Outline the TCP/IP model", "Contrast TCP with UDP", "Match common protocols to their jobs"],
          prerequisites: ["net-osi"],
          concepts: [
            { name: "TCP/IP Model", note: "A practical 4-layer model: Application, Transport, Internet, Network Access.", mistake: "Trying to line up all seven OSI layers one-to-one with the four TCP/IP layers." },
            { name: "TCP vs UDP", note: "TCP is reliable and connection-oriented; UDP is fast and connectionless.", mistake: "Assuming UDP is simply broken because it does not guarantee delivery." },
            { name: "IP", note: "The Internet Protocol routes packets from source to destination using IP addresses.", mistake: "Believing IP guarantees delivery, when reliability is TCP's job, not IP's." },
            { name: "Common Protocols", note: "HTTP for web, FTP for files, SMTP for email, DNS for name resolution.", mistake: "Confusing which protocol does what, e.g. thinking DNS transfers files." }
          ]
        },
        {
          id: "net-ip",
          title: "IP Addressing",
          summary: "How devices are named on a network.",
          difficulty: 3,
          objectives: ["Describe IPv4 structure", "Explain address classes and subnet masks", "Tell public from private addresses"],
          prerequisites: ["net-tcpip"],
          concepts: [
            { name: "IPv4 Structure", note: "An IPv4 address is 32 bits written as four octets, e.g. 192.168.1.1.", mistake: "Thinking an octet can exceed 255, or that the dots are part of the number." },
            { name: "Address Classes", note: "Classes A, B and C provide different network and host sizes.", mistake: "Judging the class from the subnet mask instead of the first octet range." },
            { name: "Subnet Mask", note: "A subnet mask separates the network portion from the host portion of an address.", mistake: "Reading the mask as an address rather than as which bits are the network part." },
            { name: "Public vs Private", note: "Private ranges (e.g. 192.168.x.x) are used inside LANs; public addresses are globally routable.", mistake: "Assuming a private address is reachable directly from the internet." }
          ]
        },
        {
          id: "net-devices",
          title: "Network Devices",
          summary: "The hardware that moves data.",
          difficulty: 2,
          objectives: ["Describe what hubs, switches and routers do", "Explain how a switch uses MAC addresses", "Say where an access point fits"],
          prerequisites: ["net-fundamentals"],
          concepts: [
            { name: "Hub", note: "A hub broadcasts incoming data to all ports and works at the physical layer.", mistake: "Thinking a hub is 'smart' like a switch, when it just repeats to every port." },
            { name: "Switch", note: "A switch forwards frames only to the correct port using MAC addresses.", mistake: "Confusing a switch (uses MAC, layer 2) with a router (uses IP, layer 3)." },
            { name: "Router", note: "A router connects different networks and forwards packets using IP addresses.", mistake: "Believing a router works within one LAN like a switch rather than between networks." },
            { name: "Access Point", note: "A wireless access point lets Wi-Fi devices join a wired network.", mistake: "Assuming an access point creates a separate network rather than extending the wired one." }
          ]
        }
      ]
    },
    {
      id: "webdev",
      name: "Web Development",
      icon: "🖥️",
      blurb: "Building web pages with HTML, CSS and JavaScript.",
      lessons: [
        {
          id: "web-html",
          title: "HTML Essentials",
          summary: "The structure of every web page.",
          difficulty: 1,
          objectives: ["Structure a page with html, head and body", "Use elements, tags and attributes", "Apply semantic tags for meaning"],
          prerequisites: [],
          concepts: [
            { name: "HTML Documents", note: "HTML uses tags to structure content; a page has html, head and body sections.", mistake: "Putting visible content in the head, or leaving out the document structure." },
            { name: "Elements & Tags", note: "An element is an opening tag, content and a closing tag, e.g. <p>text</p>.", mistake: "Forgetting the closing tag or nesting tags in the wrong order." },
            { name: "Attributes", note: "Attributes add information to elements, such as href on a link or src on an image.", mistake: "Omitting quotes around attribute values or misspelling the attribute name." },
            { name: "Semantic Tags", note: "Tags like header, nav, main, section and footer describe the meaning of content.", mistake: "Using div for everything instead of meaningful semantic tags." }
          ]
        },
        {
          id: "web-css",
          title: "CSS Fundamentals",
          summary: "Styling how pages look.",
          difficulty: 2,
          objectives: ["Target elements with selectors", "Explain the box model", "Use colours, units and basic layout"],
          prerequisites: ["web-html"],
          concepts: [
            { name: "Selectors", note: "Selectors target elements by tag, class (.name) or id (#name).", mistake: "Swapping the . (class) and # (id) prefixes, or expecting an id to match many elements." },
            { name: "The Box Model", note: "Every element is a box of content, padding, border and margin.", mistake: "Confusing padding (inside the border) with margin (outside the border)." },
            { name: "Colors & Units", note: "Colors use names, hex or rgb; sizes use px, %, em and rem.", mistake: "Assuming px and % behave the same, or that em is fixed like px." },
            { name: "Layout Basics", note: "Display, flexbox and positioning arrange elements on the page.", mistake: "Reaching for absolute positioning where flexbox or normal flow would be simpler." }
          ]
        },
        {
          id: "web-clientserver",
          title: "Client vs Server",
          summary: "What happens on each side of the web.",
          difficulty: 2,
          objectives: ["Separate front-end from back-end", "Trace an HTTP request and response", "Compare static and dynamic pages"],
          prerequisites: ["web-html"],
          concepts: [
            { name: "Front-end vs Back-end", note: "Front-end runs in the browser; back-end runs on the server.", mistake: "Thinking database or secret logic can safely run in the browser front-end." },
            { name: "HTTP Request/Response", note: "A browser sends an HTTP request and the server returns a response.", mistake: "Believing the server pushes pages unprompted rather than replying to requests." },
            { name: "Static vs Dynamic", note: "Static pages are fixed files; dynamic pages are generated per request.", mistake: "Assuming any page with JavaScript is 'dynamic' in the server-generated sense." },
            { name: "Client-Server Model", note: "Clients request services and servers provide them over a network.", mistake: "Confusing which side is the client and which is the server in an exchange." }
          ]
        },
        {
          id: "web-js",
          title: "JavaScript Basics",
          summary: "Adding behaviour to web pages.",
          difficulty: 3,
          objectives: ["Declare variables and types", "Read and change the DOM", "Respond to events with functions"],
          prerequisites: ["web-css"],
          concepts: [
            { name: "Variables & Types", note: "JavaScript uses let, const and var to store numbers, strings, booleans and objects.", mistake: "Reassigning a const, or expecting a string and a number to add the same way." },
            { name: "The DOM", note: "The Document Object Model is a tree of page elements JavaScript can read and change.", mistake: "Confusing the HTML source file with the live DOM the script actually edits." },
            { name: "Events", note: "Code can respond to user actions such as click, input and submit.", mistake: "Calling the handler immediately, e.g. onclick=fn(), instead of passing the function." },
            { name: "Functions", note: "Functions group reusable logic and can be attached to events.", mistake: "Forgetting to return a value, so the function's result is lost." }
          ]
        },
        {
          id: "web-forms",
          title: "Forms & Validation",
          summary: "Collecting and checking user input.",
          difficulty: 2,
          objectives: ["Build forms with the right input elements", "Compare GET and POST", "Explain why input must be validated"],
          prerequisites: ["web-html"],
          concepts: [
            { name: "Form Elements", note: "Forms use input, textarea, select and button to collect data.", mistake: "Leaving out the name attribute, so the field's value is never submitted." },
            { name: "GET vs POST", note: "GET appends data to the URL; POST sends data in the request body.", mistake: "Sending passwords with GET, exposing them in the URL and history." },
            { name: "Client-side Validation", note: "The browser checks input (required, type, pattern) before sending.", mistake: "Trusting client-side validation alone and skipping server-side checks." },
            { name: "Why Validate", note: "Validation improves data quality and guards against bad or malicious input.", mistake: "Assuming users always enter clean, honest data." }
          ]
        }
      ]
    },
    {
      id: "testing",
      name: "Software Testing",
      icon: "🧪",
      blurb: "Finding defects and proving software works as intended.",
      lessons: [
        {
          id: "test-fundamentals",
          title: "Testing Fundamentals",
          summary: "Why we test and the vocabulary of quality.",
          difficulty: 1,
          objectives: ["State the purpose of testing", "Tell error, defect and failure apart", "Contrast verification with validation"],
          prerequisites: [],
          concepts: [
            { name: "Purpose of Testing", note: "Testing finds defects and builds confidence that software meets requirements.", mistake: "Believing testing can prove software is completely bug-free." },
            { name: "Error, Defect, Failure", note: "A human error causes a defect in code, which may lead to a failure at run time.", mistake: "Using error, defect and failure as interchangeable words." },
            { name: "Verification vs Validation", note: "Verification asks 'built right?'; validation asks 'built the right thing?'.", mistake: "Swapping the two — checking against the spec versus against the user's real need." },
            { name: "Testing Limits", note: "Testing shows the presence of defects, not their absence; exhaustive testing is impossible.", mistake: "Assuming that passing tests means there are no remaining defects." }
          ]
        },
        {
          id: "test-levels",
          title: "Levels of Testing",
          summary: "Testing from the smallest unit to the whole system.",
          difficulty: 2,
          objectives: ["Describe unit, integration, system and acceptance testing", "Order the levels", "Say who performs acceptance testing"],
          prerequisites: ["test-fundamentals"],
          concepts: [
            { name: "Unit Testing", note: "Tests the smallest testable part, such as a single function or method.", mistake: "Calling a test that spans many modules a unit test." },
            { name: "Integration Testing", note: "Checks that combined modules work together correctly.", mistake: "Assuming units that each pass alone will automatically work together." },
            { name: "System Testing", note: "Tests the complete, integrated system against requirements.", mistake: "Confusing system testing with acceptance testing." },
            { name: "Acceptance Testing", note: "The customer confirms the system meets their needs before release.", mistake: "Thinking developers, not the customer/user, sign off acceptance testing." }
          ]
        },
        {
          id: "test-boxes",
          title: "Black-box vs White-box",
          summary: "Two ways of looking inside a test.",
          difficulty: 2,
          objectives: ["Distinguish black-box from white-box testing", "Match each to when it is used", "Explain grey-box testing"],
          prerequisites: ["test-fundamentals"],
          concepts: [
            { name: "Black-box Testing", note: "Tests functionality from inputs and outputs without seeing the code.", mistake: "Assuming black-box testers must read the source code." },
            { name: "White-box Testing", note: "Tests internal logic and paths using knowledge of the code.", mistake: "Thinking white-box only means testing done by developers, not a code-based technique." },
            { name: "When to Use Each", note: "Black-box suits functional/acceptance testing; white-box suits unit testing.", mistake: "Believing one technique replaces the other rather than complementing it." },
            { name: "Grey-box", note: "Grey-box testing combines partial code knowledge with functional testing.", mistake: "Treating grey-box as a totally separate third thing rather than a blend." }
          ]
        },
        {
          id: "test-cases",
          title: "Test Case Design",
          summary: "Designing tests that catch the most bugs.",
          difficulty: 3,
          objectives: ["List the parts of a test case", "Apply equivalence partitioning", "Use boundary value analysis"],
          prerequisites: ["test-fundamentals"],
          concepts: [
            { name: "Test Case Parts", note: "A test case has an ID, inputs, preconditions, steps and an expected result.", mistake: "Writing steps but leaving out the expected result, so pass/fail is unclear." },
            { name: "Equivalence Partitioning", note: "Group inputs into classes that should behave the same and test one from each.", mistake: "Testing many values from the same class while ignoring other classes." },
            { name: "Boundary Value Analysis", note: "Test values at the edges of ranges, where defects often hide.", mistake: "Testing only the middle of a range and skipping the boundaries." },
            { name: "Expected Result", note: "Every test must state the expected result to judge pass or fail.", mistake: "Deciding the expected result after seeing the output, which hides bugs." }
          ]
        },
        {
          id: "test-sdlc",
          title: "SDLC & Testing",
          summary: "Where testing fits in development.",
          difficulty: 2,
          objectives: ["Place testing within the SDLC", "Explain the V-model pairing", "Justify early and regression testing"],
          prerequisites: ["test-levels"],
          concepts: [
            { name: "SDLC Phases", note: "Requirements, design, implementation, testing, deployment and maintenance.", mistake: "Believing testing is a single phase at the end rather than an ongoing activity." },
            { name: "The V-Model", note: "The V-model pairs each development phase with a matching test phase.", mistake: "Reading the V-model as strictly sequential with no early test planning." },
            { name: "Early Testing", note: "Finding defects early is far cheaper than fixing them after release.", mistake: "Assuming defects cost the same to fix at any stage." },
            { name: "Regression Testing", note: "Re-running tests after changes to ensure nothing already working broke.", mistake: "Testing only the new change and skipping previously working features." }
          ]
        }
      ]
    },
    {
      id: "graphic",
      name: "Graphic Design",
      icon: "🎨",
      blurb: "The principles behind effective visual communication.",
      lessons: [
        {
          id: "gd-principles",
          title: "Design Principles",
          summary: "The rules that make layouts work.",
          difficulty: 1,
          objectives: ["Apply balance and contrast", "Use alignment to create order", "Use repetition and proximity for unity"],
          prerequisites: [],
          concepts: [
            { name: "Balance", note: "Distributing visual weight so a design feels stable, symmetrical or asymmetrical.", mistake: "Assuming balance always means perfect symmetry." },
            { name: "Contrast", note: "Difference in colour, size or shape that draws attention and aids readability.", mistake: "Using so little contrast that text and key elements are hard to see." },
            { name: "Alignment", note: "Lining up elements creates order and a clean visual connection.", mistake: "Scattering elements with no shared alignment, making the layout look messy." },
            { name: "Repetition & Proximity", note: "Repeating styles builds unity; grouping related items shows they belong together.", mistake: "Spacing related items far apart, so they no longer read as a group." }
          ]
        },
        {
          id: "gd-color",
          title: "Color Theory",
          summary: "Choosing colours that communicate.",
          difficulty: 2,
          objectives: ["Read the colour wheel", "Choose RGB or CMYK for the medium", "Build harmonious schemes"],
          prerequisites: ["gd-principles"],
          concepts: [
            { name: "The Colour Wheel", note: "Primary, secondary and tertiary colours arranged to show relationships.", mistake: "Mixing up which colours are primary versus secondary." },
            { name: "RGB vs CMYK", note: "RGB (additive) is for screens; CMYK (subtractive) is for print.", mistake: "Designing print work in RGB and getting dull, shifted colours." },
            { name: "Colour Harmony", note: "Complementary, analogous and triadic schemes create pleasing combinations.", mistake: "Confusing complementary (opposite) with analogous (neighbouring) schemes." },
            { name: "Colour Meaning", note: "Colours carry associations, such as red for urgency or blue for trust.", mistake: "Assuming colour meanings are identical across all cultures." }
          ]
        },
        {
          id: "gd-typography",
          title: "Typography",
          summary: "Making text clear and expressive.",
          difficulty: 2,
          objectives: ["Tell typeface from font", "Compare serif and sans-serif", "Use hierarchy for readability"],
          prerequisites: ["gd-principles"],
          concepts: [
            { name: "Typeface vs Font", note: "A typeface is the design family; a font is a specific size/weight of it.", mistake: "Using 'font' and 'typeface' as exact synonyms." },
            { name: "Serif vs Sans-serif", note: "Serifs have small feet on letters; sans-serif fonts are clean and modern.", mistake: "Believing one is always more readable than the other regardless of context." },
            { name: "Hierarchy", note: "Size, weight and spacing guide the eye from most to least important text.", mistake: "Making everything the same size, so nothing stands out." },
            { name: "Readability", note: "Line length, spacing and contrast affect how easily text is read.", mistake: "Cramming lines together or stretching them too wide to read comfortably." }
          ]
        },
        {
          id: "gd-images",
          title: "Image Types & Formats",
          summary: "Pixels, vectors and file choices.",
          difficulty: 2,
          objectives: ["Contrast raster and vector images", "Explain resolution and DPI", "Pick the right file format"],
          prerequisites: ["gd-principles"],
          concepts: [
            { name: "Raster vs Vector", note: "Raster images are made of pixels; vector images use scalable maths-based paths.", mistake: "Expecting a raster photo to scale up cleanly like a vector." },
            { name: "Resolution & DPI", note: "Resolution is pixel count; DPI is dots per inch affecting print quality.", mistake: "Assuming a screen-resolution image will print sharply." },
            { name: "Common Formats", note: "JPEG for photos, PNG for transparency, GIF for animation, SVG for vectors.", mistake: "Using JPEG where transparency is needed, then wondering why it has a background." },
            { name: "Compression", note: "Lossy compression discards detail to shrink files; lossless keeps all data.", mistake: "Re-saving a JPEG many times and losing quality with each lossy save." }
          ]
        },
        {
          id: "gd-workflow",
          title: "Design Tools & Workflow",
          summary: "How a design comes together.",
          difficulty: 2,
          objectives: ["Match tools to raster and vector work", "Use layers effectively", "Follow a design process and export correctly"],
          prerequisites: ["gd-images"],
          concepts: [
            { name: "Design Tools", note: "Raster editors (Photoshop) edit pixels; vector tools (Illustrator) edit paths.", mistake: "Using a pixel editor for a logo that needs to scale to any size." },
            { name: "Layers", note: "Layers stack elements so each can be edited without affecting others.", mistake: "Flattening layers too early and losing the ability to edit elements separately." },
            { name: "Design Process", note: "Brief, research, sketch, draft, review and finalise the design.", mistake: "Jumping straight to the final artwork with no brief or sketching." },
            { name: "Exporting", note: "Final artwork is exported to the right format and resolution for its use.", mistake: "Exporting at the wrong resolution or format for the intended medium." }
          ]
        }
      ]
    },
    {
      id: "sad",
      name: "System Analysis",
      icon: "📊",
      blurb: "Understanding and modelling systems before building them.",
      lessons: [
        {
          id: "sad-intro",
          title: "Introduction to System Analysis",
          summary: "What analysts do and why.",
          difficulty: 1,
          objectives: ["Define a system", "Describe the analyst's role", "Identify stakeholders and why analysis matters"],
          prerequisites: [],
          concepts: [
            { name: "What is a System", note: "A system is a set of parts working together to achieve a goal.", mistake: "Thinking of only the software and ignoring people, data and processes in the system." },
            { name: "Role of the Analyst", note: "The system analyst studies problems and designs information system solutions.", mistake: "Confusing the analyst with the programmer who writes the code." },
            { name: "Why Analyse", note: "Analysis ensures the built system actually solves the real business problem.", mistake: "Jumping to build a solution before the real problem is understood." },
            { name: "Stakeholders", note: "Stakeholders are people affected by or interested in the system.", mistake: "Counting only the paying client and forgetting end users and other affected people." }
          ]
        },
        {
          id: "sad-sdlc",
          title: "The SDLC",
          summary: "The life cycle of a system.",
          difficulty: 2,
          objectives: ["Name the SDLC phases", "Explain what each phase produces", "See how maintenance continues the cycle"],
          prerequisites: ["sad-intro"],
          concepts: [
            { name: "Planning", note: "Identify the problem, scope and feasibility of the project.", mistake: "Skipping planning and starting analysis with no defined scope." },
            { name: "Analysis", note: "Gather and study requirements for what the system must do.", mistake: "Deciding how to build (design) before agreeing what is needed (analysis)." },
            { name: "Design", note: "Decide how the system will meet the requirements technically.", mistake: "Confusing design (the how) with analysis (the what)." },
            { name: "Implementation & Maintenance", note: "Build and deploy the system, then fix and improve it over time.", mistake: "Treating go-live as the end and ignoring ongoing maintenance." }
          ]
        },
        {
          id: "sad-requirements",
          title: "Requirements Gathering",
          summary: "Finding out what users really need.",
          difficulty: 2,
          objectives: ["Choose requirement-gathering techniques", "Separate functional from non-functional requirements", "Validate requirements with users"],
          prerequisites: ["sad-sdlc"],
          concepts: [
            { name: "Gathering Techniques", note: "Interviews, questionnaires, observation and document review collect requirements.", mistake: "Relying on a single technique and missing requirements others would reveal." },
            { name: "Functional Requirements", note: "What the system must do, such as 'generate an invoice'.", mistake: "Writing vague wishes instead of clear, testable functions." },
            { name: "Non-functional Requirements", note: "Qualities like performance, security and usability.", mistake: "Ignoring non-functional needs until late, when they are costly to add." },
            { name: "Requirements Validation", note: "Checking requirements are complete, clear and agreed with users.", mistake: "Assuming the first draft of requirements is correct without user sign-off." }
          ]
        },
        {
          id: "sad-modeling",
          title: "Modeling Tools",
          summary: "Diagrams that describe a system.",
          difficulty: 3,
          objectives: ["Read a data flow diagram", "Use ER and use case diagrams", "Show process logic with a flowchart"],
          prerequisites: ["sad-requirements"],
          concepts: [
            { name: "Data Flow Diagram", note: "A DFD shows how data moves between processes, stores and external entities.", mistake: "Drawing control flow (like a flowchart) instead of data flow in a DFD." },
            { name: "ER Diagram", note: "An ERD models the data entities and their relationships.", mistake: "Putting processes or actions into an ERD, which models data, not behaviour." },
            { name: "Use Case Diagram", note: "Use cases show how actors interact with the system's functions.", mistake: "Modelling internal steps instead of actor-visible interactions." },
            { name: "Flowchart", note: "A flowchart shows the step-by-step logic of a process.", mistake: "Leaving a decision diamond with no clear yes/no branches." }
          ]
        },
        {
          id: "sad-feasibility",
          title: "Feasibility Study",
          summary: "Deciding whether a project is worth doing.",
          difficulty: 2,
          objectives: ["Assess technical and economic feasibility", "Weigh operational feasibility", "Check schedule feasibility"],
          prerequisites: ["sad-sdlc"],
          concepts: [
            { name: "Technical Feasibility", note: "Can it be built with available technology and skills?", mistake: "Assuming any idea is technically feasible without checking skills and tools." },
            { name: "Economic Feasibility", note: "Do the benefits justify the costs (cost-benefit analysis)?", mistake: "Counting build costs but ignoring ongoing running and maintenance costs." },
            { name: "Operational Feasibility", note: "Will the organisation and users actually adopt and use it?", mistake: "Assuming users will accept a system just because it works technically." },
            { name: "Schedule Feasibility", note: "Can the system be delivered within the required time frame?", mistake: "Setting a deadline with no basis in the actual work required." }
          ]
        }
      ]
    },
    {
      id: "infomgmt",
      name: "Information Management",
      icon: "📋",
      blurb: "Managing data, systems and security in the workplace.",
      lessons: [
        {
          id: "im-data",
          title: "Data, Information & Knowledge",
          summary: "Turning raw facts into insight.",
          difficulty: 1,
          objectives: ["Distinguish data, information and knowledge", "State the qualities of good information", "Explain how each builds on the last"],
          prerequisites: [],
          concepts: [
            { name: "Data", note: "Data are raw, unprocessed facts and figures.", mistake: "Calling already-processed, meaningful output 'data'." },
            { name: "Information", note: "Information is data processed into a meaningful, useful form.", mistake: "Treating raw data as information before it is processed." },
            { name: "Knowledge", note: "Knowledge is information combined with experience to guide decisions.", mistake: "Equating simply having information with genuine knowledge." },
            { name: "Qualities of Good Information", note: "Accurate, timely, relevant, complete and understandable.", mistake: "Judging information only by volume rather than by these qualities." }
          ]
        },
        {
          id: "im-systems",
          title: "Information Systems",
          summary: "Systems that support an organisation.",
          difficulty: 2,
          objectives: ["Describe TPS, MIS and DSS", "Match systems to management levels", "Explain who each system serves"],
          prerequisites: ["im-data"],
          concepts: [
            { name: "TPS", note: "A Transaction Processing System records daily routine transactions.", mistake: "Expecting a TPS to provide strategic analysis rather than record transactions." },
            { name: "MIS", note: "A Management Information System produces reports for middle managers.", mistake: "Confusing an MIS (routine reports) with a DSS (analysis for decisions)." },
            { name: "DSS", note: "A Decision Support System helps managers analyse data for decisions.", mistake: "Thinking a DSS makes the decision instead of supporting the decision-maker." },
            { name: "Levels of Management", note: "Operational, tactical and strategic levels need different information.", mistake: "Giving every level the same detailed operational reports." }
          ]
        },
        {
          id: "im-security",
          title: "Information Security",
          summary: "Protecting data from harm and loss.",
          difficulty: 3,
          objectives: ["Explain the CIA triad", "Identify common threats and controls", "Justify why backups matter"],
          prerequisites: ["im-systems"],
          concepts: [
            { name: "CIA Triad", note: "Confidentiality, Integrity and Availability are the goals of security.", mistake: "Focusing only on confidentiality and ignoring integrity and availability." },
            { name: "Threats", note: "Threats include malware, hacking, phishing and accidental loss.", mistake: "Assuming threats are only external hackers, not accidental human error." },
            { name: "Controls", note: "Passwords, encryption, firewalls and access rights protect data.", mistake: "Believing a single control (e.g. a password) is enough on its own." },
            { name: "Backups", note: "Regular backups allow recovery after loss, corruption or disaster.", mistake: "Making backups but never testing that they can actually be restored." }
          ]
        },
        {
          id: "im-management",
          title: "Management Functions",
          summary: "How managers turn plans into results.",
          difficulty: 2,
          objectives: ["Name the four management functions", "Explain what each function achieves", "Relate the functions to a work example"],
          prerequisites: ["im-systems"],
          concepts: [
            { name: "Planning", note: "Setting goals and deciding how to achieve them.", mistake: "Jumping into action without setting clear goals first." },
            { name: "Organizing", note: "Arranging people and resources to carry out the plan.", mistake: "Confusing organizing (arranging resources) with leading (motivating people)." },
            { name: "Leading", note: "Motivating and directing staff toward the goals.", mistake: "Reducing leading to giving orders rather than motivating people." },
            { name: "Controlling", note: "Measuring performance and correcting deviations from the plan.", mistake: "Treating controlling as blame rather than measuring and correcting." }
          ]
        },
        {
          id: "im-workplace",
          title: "ICT in the Workplace",
          summary: "Using ICT responsibly and productively at work.",
          difficulty: 1,
          objectives: ["Use workplace communication tools appropriately", "Apply ICT ethics", "Work safely with ICT"],
          prerequisites: ["im-management"],
          concepts: [
            { name: "Workplace Communication", note: "Email, messaging and video tools support clear professional communication.", mistake: "Using an over-casual tone in professional workplace messages." },
            { name: "ICT Ethics", note: "Responsible, legal and respectful use of technology and data.", mistake: "Assuming anything technically possible is also ethical or legal." },
            { name: "Productivity Tools", note: "Word processors, spreadsheets and presentations support daily work.", mistake: "Picking the wrong tool, e.g. a word processor for heavy calculations." },
            { name: "Health & Safety", note: "Good ergonomics and screen breaks protect workers using ICT.", mistake: "Ignoring posture and breaks until strain or injury appears." }
          ]
        }
      ]
    }
  ]
};

teacherData.getSubject = function (subjectId) {
  return this.subjects.find(s => s.id === subjectId) || null;
};
teacherData.getLesson = function (subjectId, lessonId) {
  const subject = this.getSubject(subjectId);
  if (!subject) return null;
  return subject.lessons.find(l => l.id === lessonId) || null;
};
teacherData.recommendNext = function (subjectId, lessonId) {
  const sIndex = this.subjects.findIndex(s => s.id === subjectId);
  if (sIndex === -1) return null;
  const subject = this.subjects[sIndex];
  const lIndex = subject.lessons.findIndex(l => l.id === lessonId);
  if (lIndex !== -1 && lIndex < subject.lessons.length - 1) {
    return { subject, lesson: subject.lessons[lIndex + 1] };
  }
  const nextSubject = this.subjects[(sIndex + 1) % this.subjects.length];
  return { subject: nextSubject, lesson: nextSubject.lessons[0] };
};

/* Verified against the public Sri Lankan NVQ/TVEC search portal:
 * https://nvq.gov.lk/Report_Inquires/View_Skills.php?ind=E-M&lvl1=0
 * The portal identifies these Level 5-6 NCS areas, but its public detail
 * endpoint does not expose individual unit titles. We therefore record only
 * the verified area names/codes and never claim invented unit mappings.
 */
teacherData.officialCurriculum = {
  source: "Sri Lankan NVQ/TVEC public NCS search portal",
  sourceUrls: [
    "https://tvec.gov.lk/national-competency-standards/",
    "https://nvq.gov.lk/Report_Inquires/Search_Skill.php",
    "https://nvq.gov.lk/Report_Inquires/View_Skills.php?ind=E-M&lvl1=0"
  ],
  verificationDate: "2026-09-06",
  levelScope: "Diploma (Level 5-6)",
  areas: [
    { name: "Information and Communication Technology", code: "K72T001", packageLevel: "L5-L6" },
    { name: "Information and Cyber Security Technology", code: "K72T002", packageLevel: "L5-L6" },
    { name: "Full Stack Software Development", code: "K72T004", packageLevel: "L5-L6" },
    { name: "Multimedia Designing", code: "K72T006", packageLevel: "L5-L6" }
  ],
  unitTitlesVerified: false,
  note: "Area names and codes are verified; individual unit titles and assessment requirements were not exposed by the public endpoint and are not asserted here."
};

/* Internal map used by review and future content tooling. It distinguishes
 * broad scope support from a claim that a lesson is an official unit. */
teacherData.curriculumMap = [
  { officialArea: "Information and Communication Technology", code: "K72T001", subject: "infomgmt", lessons: ["im-data", "im-systems", "im-management", "im-workplace"], status: "scope-supported" },
  { officialArea: "Information and Cyber Security Technology", code: "K72T002", subject: "infomgmt", lessons: ["im-security", "im-cybersecurity"], status: "scope-supported" },
  { officialArea: "Full Stack Software Development", code: "K72T004", subject: "programming", lessons: ["prog-fundamentals", "prog-control", "prog-functions", "prog-arrays", "prog-oop"], status: "scope-supported" },
  { officialArea: "Full Stack Software Development", code: "K72T004", subject: "webdev", lessons: ["web-html", "web-css", "web-clientserver", "web-js", "web-forms"], status: "scope-supported" },
  { officialArea: "Full Stack Software Development", code: "K72T004", subject: "database", lessons: ["db-concepts", "db-relational", "db-normalization", "db-sql", "db-er"], status: "scope-supported" },
  { officialArea: "Full Stack Software Development", code: "K72T004", subject: "testing", lessons: ["test-fundamentals", "test-levels", "test-boxes", "test-cases", "test-sdlc"], status: "scope-supported" },
  { officialArea: "Multimedia Designing", code: "K72T006", subject: "graphic", lessons: ["gd-principles", "gd-color", "gd-typography", "gd-images", "gd-workflow"], status: "scope-supported" },
  { officialArea: null, code: null, subject: "sad", lessons: ["sad-intro", "sad-sdlc", "sad-requirements", "sad-modeling", "sad-feasibility"], status: "supplemental" },
  { officialArea: null, code: null, subject: "networking", lessons: ["net-fundamentals", "net-osi", "net-tcpip", "net-ip", "net-devices"], status: "supplemental-until-unit-source-verified" }
];

/* The verified K72T002 area was absent as a distinct lesson. This adds only
 * foundational security technology content already within the existing ICT
 * scope; it does not invent official unit titles or assessment rules. */
const informationSubject = teacherData.subjects.find(s => s.id === "infomgmt");
if (informationSubject && !informationSubject.lessons.some(l => l.id === "im-cybersecurity")) {
  informationSubject.lessons.splice(3, 0, {
    id: "im-cybersecurity",
    title: "Cybersecurity Technology Foundations",
    summary: "Protecting systems, networks and information through layered controls.",
    difficulty: 3,
    objectives: ["Identify assets, threats, vulnerabilities and risk", "Apply authentication, authorisation and least privilege", "Explain secure operations, incident response and recovery"],
    prerequisites: ["im-security"],
    concepts: [
      { name: "Assets, Threats, Vulnerabilities & Risk", note: "An asset has value; a threat can cause harm; a vulnerability is a weakness; risk combines likelihood and impact.", mistake: "Calling every threat a vulnerability, or treating risk as certain loss rather than a reasoned likelihood and impact." },
      { name: "Authentication & Authorisation", note: "Authentication verifies who a user is; authorisation decides what that identity may access. Strong systems enforce least privilege.", mistake: "Treating a successful login as permission to access every record, or storing passwords in plain text." },
      { name: "Secure Network and System Controls", note: "Layered controls include patching, secure configuration, access control, firewalls, segmentation, encryption and monitored logs.", mistake: "Relying on one perimeter control and ignoring patching, internal access or configuration weaknesses." },
      { name: "Incident Response", note: "A response process identifies, contains, eradicates and recovers from an incident, while preserving evidence and recording lessons learned.", mistake: "Deleting logs or immediately rebuilding a machine before understanding how the incident happened." },
      { name: "Business Continuity and Recovery", note: "Backups, recovery priorities, tested procedures and alternate arrangements help an organisation continue after disruption.", mistake: "Assuming that having a backup proves recovery readiness without testing restoration and recovery time." }
    ]
  });
}

/* Attach the map status to lesson records so the teacher can distinguish a
 * verified Level 5-6 area from supplemental study material at runtime. */
teacherData.curriculumMap.forEach(entry => {
  const subject = teacherData.subjects.find(s => s.id === entry.subject);
  if (!subject) return;
  entry.lessons.forEach(lessonId => {
    const lesson = subject.lessons.find(l => l.id === lessonId);
    if (!lesson) return;
    lesson.curriculumStatus = entry.status;
    lesson.officialArea = entry.officialArea || null;
    lesson.officialCode = entry.code || null;
  });
});

/*
 * Teaching depth layer.  The short `note` values above remain the compact,
 * backwards-compatible summary used by older pages.  E.J.AI also receives a
 * structured teaching guide for each concept.  These guides are deliberately
 * framed as study material aligned to the competency areas (not as invented
 * TVEC unit codes or assessment claims).
 */
(function addTeachingGuides(data) {
  const domain = {
    programming: {
      why: "Programs are built from this idea; understanding it helps you design, explain and debug reliable solutions.",
      example: "For a college fee calculator, identify the input values, the processing rule and the output before writing code.",
      application: "You are asked to improve a small college program. Explain where this concept would appear and what could go wrong if it is used incorrectly.",
      connections: "Relate it to algorithms, testing and debugging: a clear model makes the later code easier to verify."
    },
    database: {
      why: "Correct data design prevents duplication, conflicting records and unsafe updates in real information systems.",
      example: "A college database stores students, courses and enrollments. Decide what belongs in a table, what identifies a row and how tables are linked.",
      application: "For the college database scenario, describe the design or query decision you would make using this concept and justify it.",
      connections: "Connect it to keys, relationships, SQL, integrity and backup so the design remains useful in practice."
    },
    networking: {
      why: "Networks must move data predictably, share resources and remain available and secure for users.",
      example: "An office has 20 wired PCs, Wi-Fi laptops, a switch, a router and a server. Trace how a user reaches a shared resource.",
      application: "Choose a practical network or troubleshooting action for the office scenario and explain why it fits.",
      connections: "Relate it to addressing, protocols, devices, performance and security; a change at one layer can affect another."
    },
    webdev: {
      why: "Web systems combine structure, presentation, browser behaviour, server processing and data; knowing the boundary prevents fragile designs.",
      example: "When a student submits a login form, the browser sends a request, the server validates it and a database lookup determines the response.",
      application: "For a college website, describe how you would use this concept in a page or request and mention one security or usability concern.",
      connections: "Connect HTML, CSS and JavaScript with HTTP, validation, server code, databases and deployment."
    },
    testing: {
      why: "Testing supplies evidence that a system meets requirements and exposes defects before users depend on it.",
      example: "For a mark-entry form, include valid, boundary, invalid and missing inputs, then record expected and actual results.",
      application: "Create or choose a test for the described requirement and explain what result would pass or fail.",
      connections: "Link requirements to test cases, defect reports, debugging and regression testing."
    },
    graphic: {
      why: "Design decisions affect readability, meaning and production quality, not just appearance.",
      example: "Prepare a poster for a VTA open day: establish hierarchy, align content, choose a suitable colour mode and export for print.",
      application: "Recommend a design decision for the poster and justify it for its audience and medium.",
      connections: "Relate principles to typography, colour, image formats, layers and the review workflow."
    },
    sad: {
      why: "Analysis reduces rework by making the real problem, users and constraints visible before implementation.",
      example: "A hotel wants online food ordering. Identify stakeholders, inputs, outputs, rules and a diagram that would clarify the system.",
      application: "For the hotel scenario, make one analysis or design decision using this concept and explain the evidence behind it.",
      connections: "Connect stakeholder needs to requirements, models, feasibility, design, testing and maintenance."
    },
    infomgmt: {
      why: "Organisations depend on trustworthy information, responsible decisions and safe working practices.",
      example: "A training centre must protect learner records while still giving authorised staff timely reports.",
      application: "Choose an appropriate workplace action for the training-centre scenario and justify it using this concept.",
      connections: "Relate it to people, processes, information quality, security controls and management decisions."
    }
  };
  const keywordDetail = (subjectId, name, note, mistake) => {
    const d = domain[subjectId] || domain.infomgmt;
    const n = String(name).toLowerCase();
    let how = "Break the idea into its parts, apply the rule to a small example, then verify the result against the requirement.";
    if (subjectId === "programming") {
      if (/variable|data type/.test(n)) how = "Choose a meaningful name, select a type that represents the data, assign a value and convert input when necessary; then trace how the value changes.";
      else if (/operator/.test(n)) how = "Read expressions using precedence, distinguish assignment from comparison, and combine relational results with logical operators.";
      else if (/input|output/.test(n)) how = "Validate input, convert text to the required type, process it, and present an output that a user can understand.";
      else if (/condition/.test(n)) how = "Write a Boolean condition, test each branch with normal and boundary values, and keep mutually exclusive choices in a clear order.";
      else if (/loop|iteration/.test(n)) how = "Initialise a control variable, state the stopping condition and update it on every pass; dry-run the first, middle and last iterations.";
      else if (/function|scope|recursion/.test(n)) how = "Give one function one responsibility, define its inputs and output, and trace local state and the base case when applicable.";
      else if (/array|string/.test(n)) how = "Model the collection, confirm its valid indexes, traverse it systematically and test empty, first and last elements.";
    } else if (subjectId === "database") {
      if (/key/.test(n)) how = "Ask what uniquely identifies a row, enforce uniqueness and null rules, then place the foreign key on the table that represents the relationship.";
      else if (/normal|redund|anomal/.test(n)) how = "List dependencies, remove repeating groups, separate partial and transitive dependencies, and check that insert, update and delete operations remain consistent.";
      else if (/sql|select|join|insert|update|delete/.test(n)) how = "State the required result first, choose tables and columns, add a precise condition or join, and test the query with representative rows.";
      else if (/entity|relationship|cardinality|er/.test(n)) how = "Identify real things and their properties, name the relationship and cardinality, then map many-to-many relationships through a link table.";
    } else if (subjectId === "networking") {
      if (/osi|tcp|protocol|layer/.test(n)) how = "Describe the job of the relevant layer, name the data unit or protocol involved, and trace encapsulation from sender to receiver.";
      else if (/ip|address|subnet/.test(n)) how = "Separate network and host portions, check whether addresses share a network, and avoid assigning network or broadcast addresses to hosts.";
      else if (/device|router|switch|topolog/.test(n)) how = "Choose the device or layout by the traffic and failure requirement, then explain the path and the effect of a failure.";
    } else if (subjectId === "webdev") {
      if (/html|semantic|form/.test(n)) how = "Use semantic structure, associate labels with controls, submit named values and check the result in the browser.";
      else if (/css|style|layout/.test(n)) how = "Select elements with a predictable selector, apply the box model and responsive rules, and verify readability at different widths.";
      else if (/javascript|script|client/.test(n)) how = "Listen for an event, read the relevant data, validate it, update the page and handle an error without trusting client input alone.";
      else if (/server|backend|database|http/.test(n)) how = "Trace the request and response, validate and authorise on the server, use a parameterised database operation and return a useful status.";
    } else if (subjectId === "testing") {
      if (/test case|test data|boundary/.test(n)) how = "Start from the requirement, choose normal, boundary, invalid and missing data, record expected results and compare with the actual result.";
      else if (/black|white|level|functional/.test(n)) how = "State what is visible at that test level, choose an appropriate test basis and record reproducible evidence.";
    } else if (subjectId === "sad") {
      if (/requirement|stakeholder|gather/.test(n)) how = "Identify who needs the system, ask open and clarifying questions, record testable statements and validate them with stakeholders.";
      else if (/diagram|model|flow/.test(n)) how = "Choose the model that answers the question, use consistent symbols and names, and trace one realistic scenario through it.";
      else if (/feasib/.test(n)) how = "Check technical, economic, operational and schedule evidence rather than relying on an attractive idea.";
    } else if (subjectId === "infomgmt") {
      if (/security|threat|backup|cia/.test(n)) how = "Identify the asset and risk, select preventive and recovery controls, limit access and test that recovery really works.";
      else if (/communication|ethic|workplace|health|safety/.test(n)) how = "Consider the audience, policy, legal and safety context, then document and review the professional action.";
    }
    return {
      definition: note,
      purpose: d.why,
      how,
      example: d.example,
      application: d.application,
      commonMistake: mistake || "Check the terms carefully and test the idea with a concrete example.",
      connections: d.connections,
      check: `Explain ${name} in your own words, then apply it to this situation: ${d.application}`,
      challenge: `Give one reason your choice would work and one risk or limitation a practitioner should review.`,
      supplemental: true,
      type: "curriculum-aligned-study",
      officialClaim: false
    };
  };
  data.subjects.forEach(subject => subject.lessons.forEach(lesson => lesson.concepts.forEach(concept => {
    concept.teaching = Object.assign(keywordDetail(subject.id, concept.name, concept.note, concept.mistake), concept.teaching || {});
  })));
})(teacherData);
if (typeof window !== "undefined") {
  window.teacherData = teacherData;
}
